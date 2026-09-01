import {
  gen3HiddenPower,
  GEN3_STATIC_MAX_RESULTS,
  type Gen3StaticRequest,
  type Gen3StaticState,
} from "../domain";
import type {
  Gen3StaticSearchEngine,
  Gen3StaticSearchOptions,
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "../search";

const PREVIEW_SAMPLE_LIMIT = 500;
const PREVIEW_STEP_LIMIT = 8;

function previewState(
  request: Gen3StaticRequest,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Gen3StaticState {
  const offset =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const advances = request.initialAdvances + offset;
  let mixed =
    (request.seed ^
      Math.imul(advances, 0x045d9f3b) ^
      request.template.species) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
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
  return {
    advances,
    pid,
    ivs,
    ability: pid & 1,
    gender:
      request.template.genderRatio === 255
        ? 2
        : request.template.genderRatio === 254
          ? 1
          : 0,
    level: request.template.level,
    nature: pid % 25,
    shiny: 0,
  };
}

function matches(request: Gen3StaticRequest, state: Gen3StaticState) {
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

export class Gen3StaticUiPreviewEngine implements Gen3StaticSearchEngine {
  private running = false;
  private cancelActive?: () => void;
  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen3StaticRequest,
    options: Gen3StaticSearchOptions = {},
  ): Promise<Gen3StaticSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 static UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = request.maxAdvances + 1;
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN3_STATIC_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen3StaticSearchProgress => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent: (processedStates / totalStates) * 100,
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
        const visibleBatch = batch.slice(0, Math.max(0, remaining));
        if (visibleBatch.length > 0) options.onBatch?.(visibleBatch);
        resultCount += Math.min(batch.length, Math.max(0, remaining));
        if (batch.length > remaining) resultLimitReached = true;
        processedStates = Math.floor(((step + 1) * totalStates) / stepCount);
        report();
        if (resultLimitReached) break;
      }
      const progress = report();
      return {
        ...progress,
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
