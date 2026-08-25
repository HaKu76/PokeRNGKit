import { gen3HiddenPower } from "../../shared/gen3HiddenPower";
import { ivCombinationAtIndex } from "../../shared/perfectIvCombinations";
import {
  gen3WildSearcherCombinationCount,
  GEN3_WILD_MAX_RESULTS,
  type Gen3WildSearcherRequest,
  type Gen3WildSearcherState,
} from "../domain";
import type { Gen3WildSearchProgress, Gen3WildSearchSummary } from "../search";
import type {
  Gen3WildSearcherEngine,
  Gen3WildSearcherOptions,
} from "../searcher";

const PREVIEW_SAMPLE_LIMIT = 500;
const PREVIEW_STEP_LIMIT = 8;

function previewState(
  request: Gen3WildSearcherRequest,
  combinationIndex: number,
) {
  const ivs = ivCombinationAtIndex(
    combinationIndex,
    request.filters.ivMin,
    request.filters.ivMax,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
  );
  let mixed = request.tid ^ (request.sid << 16) ^ combinationIndex;
  for (const iv of ivs) mixed = Math.imul(mixed ^ iv, 0x045d_9f3b) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d_9f3b) >>> 0;
  const encounterSlot = mixed % request.area.slots.length;
  const slot = request.area.slots[encounterSlot];
  const level =
    slot.minLevel + ((mixed >>> 8) % (slot.maxLevel - slot.minLevel + 1));
  const pid = mixed;
  const trainerXor = request.tid ^ request.sid;
  const pidXor = (pid >>> 16) ^ (pid & 0xffff);
  return {
    seed: (Math.imul(mixed, 0x41c6_4e6d) + 0x6073) >>> 0,
    pid,
    ivs,
    ability: pid & 1,
    gender:
      slot.genderRatio === 255
        ? 2
        : slot.genderRatio === 254
          ? 1
          : slot.genderRatio === 0
            ? 0
            : (pid & 0xff) < slot.genderRatio
              ? 1
              : 0,
    level,
    nature: pid % 25,
    shiny: trainerXor === pidXor ? 2 : (trainerXor ^ pidXor) < 8 ? 1 : 0,
    encounterSlot,
    species: slot.species,
    form: slot.form,
  } satisfies Gen3WildSearcherState;
}

function matches(
  request: Gen3WildSearcherRequest,
  state: Gen3WildSearcherState,
) {
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
    (filters.hiddenPowerMask & (1 << gen3HiddenPower(state.ivs).type)) !== 0 &&
    state.ivs.filter((value) => value >= filters.perfectIvValue).length >=
      filters.perfectIvCount &&
    (filters.encounterSlotMask & (1 << state.encounterSlot)) !== 0 &&
    state.level >= filters.levelMin &&
    state.level <= filters.levelMax
  );
}

function pause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}

export class Gen3WildSearcherUiPreviewEngine implements Gen3WildSearcherEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen3WildSearcherRequest,
    options: Gen3WildSearcherOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 wild search UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen3WildSearcherCombinationCount(request);
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN3_WILD_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen3WildSearchProgress => {
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
        const batch = Array.from({ length: end - start }, (_, index) => {
          const sampleIndex = start + index;
          const combinationIndex =
            sampleCount <= 1
              ? 0
              : Math.floor(
                  (sampleIndex * (totalStates - 1)) / (sampleCount - 1),
                );
          return previewState(request, combinationIndex);
        }).filter((state) => matches(request, state));
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
