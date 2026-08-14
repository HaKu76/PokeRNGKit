import {
  gen4EggGeneratorCombinationCount,
  GEN4_EGG_MAX_RESULTS,
  type Gen4EggGeneratorRequest,
  type Gen4EggIvTuple,
  type Gen4EggState,
} from "../domain";
import type {
  Gen4EggGeneratorEngine,
  Gen4EggGeneratorOptions,
  Gen4EggProgress,
  Gen4EggSummary,
} from "../search";
import {
  GEN4_EGG_PREVIEW_SAMPLE_LIMIT,
  GEN4_EGG_PREVIEW_STEP_LIMIT,
  gen4EggPreviewGender,
  gen4EggPreviewHiddenPower,
  gen4EggPreviewMatchesFilters,
  gen4EggPreviewMix,
  gen4EggPreviewPause,
} from "./shared";

function previewState(
  request: Gen4EggGeneratorRequest,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Gen4EggState {
  const combinationIndex =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const pickupWidth = request.maxAdvancesPickup + 1;
  const heldOffset = Math.floor(combinationIndex / pickupWidth);
  const pickupOffset = combinationIndex % pickupWidth;
  const advances = request.initialAdvancesHeld + heldOffset;
  const pickupAdvances = request.initialAdvancesPickup + pickupOffset;
  const mixed = gen4EggPreviewMix(
    request.seedHeld ^
      request.seedPickup ^
      Math.imul(advances + request.offsetHeld, 0x27d4eb2d) ^
      Math.imul(pickupAdvances + request.offsetPickup, 0x165667b1) ^
      request.species,
  );
  const pid = gen4EggPreviewMix(mixed ^ request.tid ^ (request.sid << 16));
  const rawIvs: Gen4EggIvTuple = [
    mixed & 31,
    (mixed >>> 5) & 31,
    (mixed >>> 10) & 31,
    (mixed >>> 15) & 31,
    (mixed >>> 20) & 31,
    (mixed >>> 25) & 31,
  ];
  const inheritance: Gen4EggIvTuple = [0, 0, 0, 0, 0, 0];
  const ivs = [...rawIvs] as Gen4EggIvTuple;
  const inheritedStats = [mixed % 6, (mixed >>> 8) % 6, (mixed >>> 16) % 6];
  inheritedStats.forEach((stat, index) => {
    const parent = ((mixed >>> (20 + index)) & 1) + 1;
    inheritance[stat] = parent;
    ivs[stat] = (parent === 1 ? request.parentA : request.parentB).ivs[stat];
  });
  const power = gen4EggPreviewHiddenPower(ivs);
  const ratio =
    (request.species === 29 || request.species === 314) && (pid & 0x8000) !== 0
      ? request.alternateGenderRatio
      : request.genderRatio;
  return {
    advances,
    pickupAdvances,
    pid,
    ability: pid & 1,
    gender: gen4EggPreviewGender(pid, ratio),
    nature: pid % 25,
    shiny:
      ((pid >>> 16) ^ (pid & 0xffff) ^ request.tid ^ request.sid) < 8 ? 1 : 0,
    ivs,
    inheritance,
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    call: mixed % 3,
    chatot: Math.trunc(((mixed % 8192) * 100) / 8192),
  };
}

export class Gen4EggUiPreviewEngine implements Gen4EggGeneratorEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4EggGeneratorRequest,
    options: Gen4EggGeneratorOptions = {},
  ): Promise<Gen4EggSummary> {
    if (this.running)
      throw new Error("A Gen4 egg UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen4EggGeneratorCombinationCount(request);
    const sampleCount = Math.min(totalStates, GEN4_EGG_PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, GEN4_EGG_PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN4_EGG_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen4EggProgress => {
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
        await gen4EggPreviewPause(this.stepDelayMs);
        if (cancelled) break;
        const start = Math.floor((step * sampleCount) / stepCount);
        const end = Math.floor(((step + 1) * sampleCount) / stepCount);
        const batch = Array.from({ length: end - start }, (_, index) =>
          previewState(request, start + index, sampleCount, totalStates),
        ).filter((state) =>
          gen4EggPreviewMatchesFilters(request.filters, state),
        );
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
