import {
  GEN4_WILD_MAX_RESULTS,
  type Gen4IvTuple,
  type Gen4WildGeneratorRequest,
  type Gen4WildState,
} from "../domain";
import type {
  Gen4WildEngine,
  Gen4WildOptions,
  Gen4WildProgress,
  Gen4WildSummary,
} from "../worker/Gen4WildWorkerPool";
import {
  hiddenPower,
  matchesFilters,
  pause,
  PREVIEW_SAMPLE_LIMIT,
  PREVIEW_STEP_LIMIT,
  previewGender,
} from "./shared";

function previewState(
  request: Gen4WildGeneratorRequest,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Gen4WildState {
  const offset =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const advances = request.initialAdvances + offset;
  let mixed =
    (request.seed ^
      Math.imul(advances, 0x045d9f3b) ^
      Math.imul(request.area.location + 1, 0x27d4eb2d)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const pid = (mixed ^ (mixed >>> 16)) >>> 0;
  const slotIndex =
    request.method === "honeyTree" || request.method === "pokeRadar"
      ? request.fixedSlot
      : mixed % request.area.slots.length;
  const slot = request.area.slots[slotIndex];
  const levelWidth = slot.maxLevel - slot.minLevel + 1;
  const ivs: Gen4IvTuple = [
    mixed & 31,
    (mixed >>> 5) & 31,
    (mixed >>> 10) & 31,
    (mixed >>> 15) & 31,
    (mixed >>> 20) & 31,
    (mixed >>> 25) & 31,
  ];
  const power = hiddenPower(ivs);
  return {
    advances,
    battleAdvances: mixed & 0xff,
    pid,
    ivs,
    ability: pid & 1,
    gender: previewGender(pid, slot.genderRatio),
    level: slot.minLevel + (mixed % levelWidth),
    nature: pid % 25,
    shiny: request.pokeRadarShiny && sampleIndex % 7 === 0 ? 1 : 0,
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    encounterSlot: slotIndex,
    species: slot.species,
    form: slot.form,
    item: slot.items[(mixed >>> 8) % 2],
    call: mixed % 3,
    chatot: Math.trunc(((mixed % 8192) * 100) / 8192),
  };
}

export class Gen4WildUiPreviewEngine implements Gen4WildEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4WildGeneratorRequest,
    options: Gen4WildOptions = {},
  ): Promise<Gen4WildSummary> {
    if (this.running) {
      throw new Error("A Gen4 wild UI preview is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const totalStates = request.maxAdvances + 1;
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN4_WILD_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen4WildProgress => {
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
        ).filter((state) => matchesFilters(request.filters, state));
        const remaining = maxResults - resultCount;
        const visible = batch.slice(0, Math.max(0, remaining));
        if (visible.length > 0) options.onBatch?.(visible);
        resultCount += visible.length;
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
