import { gen3HiddenPower } from "../../shared/gen3HiddenPower";
import {
  GEN3_EGG_MAX_RESULTS,
  type Gen3EggRequest,
  type Gen3EggState,
} from "../domain";
import type {
  Gen3EggSearchEngine,
  Gen3EggSearchOptions,
  Gen3EggSearchProgress,
  Gen3EggSearchSummary,
} from "../search";

const PREVIEW_SAMPLE_LIMIT = 500;
const PREVIEW_STEP_LIMIT = 8;

function previewState(
  request: Gen3EggRequest,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Gen3EggState {
  const offset =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const pickupRange = request.maxAdvancesPickup + 1;
  const redrawRange =
    request.game === "emerald"
      ? request.maxRedraws - request.minRedraws + 1
      : 1;
  const heldIndex = Math.floor(offset / (pickupRange * redrawRange));
  const pickupIndex = Math.floor(offset / redrawRange) % pickupRange;
  const redrawIndex = offset % redrawRange;
  let mixed =
    (request.species ^
      Math.imul(request.initialAdvancesHeld + heldIndex, 0x045d_9f3b) ^
      Math.imul(request.initialAdvancesPickup + pickupIndex, 0x119d_de1f) ^
      request.seedHeld ^
      (request.seedPickup << 1)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d_9f3b) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;
  const pid = mixed;
  const ivs: [number, number, number, number, number, number] = [
    mixed & 31,
    (mixed >>> 5) & 31,
    (mixed >>> 10) & 31,
    (mixed >>> 15) & 31,
    (mixed >>> 20) & 31,
    (mixed >>> 25) & 31,
  ];
  const hiddenPower = gen3HiddenPower(ivs);
  const ratio = request.genderRatio;
  const gender =
    ratio === 255
      ? 2
      : ratio === 254
        ? 1
        : ratio === 0
          ? 0
          : (pid & 0xff) < ratio
            ? 1
            : 0;
  const trainerXor = request.tid ^ request.sid;
  const pidXor = (pid >>> 16) ^ (pid & 0xffff);
  const shinyXor = trainerXor ^ pidXor;
  return {
    advances: request.initialAdvancesHeld + heldIndex,
    pickupAdvances: request.initialAdvancesPickup + pickupIndex,
    redraws: request.game === "emerald" ? request.minRedraws + redrawIndex : 0,
    pid,
    ability: pid & 1,
    gender,
    nature: pid % 25,
    shiny: shinyXor === 0 ? 2 : shinyXor < 8 ? 1 : 0,
    ivs,
    inheritance: [0, 0, 0, 0, 0, 0],
    hiddenPower: hiddenPower.type,
    hiddenPowerStrength: hiddenPower.power,
  };
}

function matches(request: Gen3EggRequest, state: Gen3EggState) {
  const { filters } = request;
  const shinyMatch =
    filters.shiny === "any" ||
    (filters.shiny === "star" && state.shiny === 1) ||
    (filters.shiny === "square" && state.shiny === 2) ||
    (filters.shiny === "star-square" && state.shiny !== 0);
  const genderMatch =
    filters.gender === "any" ||
    (filters.gender === "male" && state.gender === 0) ||
    (filters.gender === "female" && state.gender === 1);
  const abilityMatch =
    filters.ability === "any" ||
    (filters.ability === "first" && state.ability === 0) ||
    (filters.ability === "second" && state.ability === 1);
  return (
    shinyMatch &&
    genderMatch &&
    abilityMatch &&
    (filters.natureMask & (1 << state.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << state.hiddenPower)) !== 0 &&
    state.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

function pause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}

export class Gen3EggUiPreviewEngine implements Gen3EggSearchEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen3EggRequest,
    options: Gen3EggSearchOptions = {},
  ): Promise<Gen3EggSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 egg UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const redrawRange =
      request.game === "emerald"
        ? request.maxRedraws - request.minRedraws + 1
        : 1;
    const totalStates =
      (request.maxAdvancesHeld + 1) *
      (request.maxAdvancesPickup + 1) *
      redrawRange;
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN3_EGG_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen3EggSearchProgress => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    try {
      for (let step = 0; step < stepCount && !cancelled; step++) {
        await pause(this.stepDelayMs);
        if (cancelled) break;
        const start = Math.floor((step * sampleCount) / stepCount);
        const end = Math.floor(((step + 1) * sampleCount) / stepCount);
        const batch = Array.from({ length: end - start }, (_, index) =>
          previewState(request, start + index, sampleCount, totalStates),
        ).filter((state) => matches(request, state));
        const remaining = maxResults - resultCount;
        const accepted = batch.slice(0, Math.max(0, remaining));
        if (accepted.length > 0) options.onBatch?.(accepted);
        resultCount += accepted.length;
        if (batch.length > remaining) resultLimitReached = true;
        processedStates = Math.floor(((step + 1) * totalStates) / stepCount);
        report();
        if (resultLimitReached) break;
      }
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount: 0,
        cancelled,
        resultLimitReached,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.cancel();
  }
}
