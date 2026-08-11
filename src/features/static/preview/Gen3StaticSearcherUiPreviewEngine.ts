import {
  gen3StaticSearcherCombinationCount,
  GEN3_STATIC_MAX_RESULTS,
  type Gen3StaticSearcherRequest,
  type Gen3StaticSearcherState,
} from "../domain";
import type {
  Gen3StaticSearcherEngine,
  Gen3StaticSearcherOptions,
} from "../searcher";
import type {
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "../search";

const PREVIEW_SAMPLE_LIMIT = 500;
const PREVIEW_STEP_LIMIT = 8;

function ivsAtIndex(request: Gen3StaticSearcherRequest, index: number) {
  const ivs = [0, 0, 0, 0, 0, 0] as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  for (let stat = 5; stat >= 0; stat--) {
    const size = request.filters.ivMax[stat] - request.filters.ivMin[stat] + 1;
    ivs[stat] = request.filters.ivMin[stat] + (index % size);
    index = Math.floor(index / size);
  }
  return ivs;
}

function previewState(
  request: Gen3StaticSearcherRequest,
  combinationIndex: number,
): Gen3StaticSearcherState {
  const ivs = ivsAtIndex(request, combinationIndex);
  let mixed =
    (Math.imul(combinationIndex + 1, 0x045d9f3b) ^
      request.template.species ^
      request.tid ^
      (request.sid << 16)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const pid = (mixed ^ (mixed >>> 16)) >>> 0;
  return {
    seed: Math.imul(pid ^ 0xa5a5a5a5, 0x41c64e6d) >>> 0,
    pid,
    ivs: request.template.buggedRoamer ? [ivs[0], ivs[1] & 7, 0, 0, 0, 0] : ivs,
    ability: pid & 1,
    gender:
      request.template.genderRatio === 255
        ? 2
        : request.template.genderRatio === 254
          ? 1
          : (pid & 0xff) < request.template.genderRatio
            ? 1
            : 0,
    level: request.template.level,
    nature: pid % 25,
    shiny: 0,
  };
}

function matches(
  request: Gen3StaticSearcherRequest,
  state: Gen3StaticSearcherState,
) {
  const { filters } = request;
  return (
    (filters.shiny === "any" ||
      (filters.shiny === "none" && state.shiny === 0)) &&
    (filters.gender === "any" ||
      (filters.gender === "male" && state.gender === 0) ||
      (filters.gender === "female" && state.gender === 1) ||
      (filters.gender === "genderless" && state.gender === 2)) &&
    (filters.ability === "any" ||
      (filters.ability === "first" && state.ability === 0) ||
      (filters.ability === "second" && state.ability === 1)) &&
    (filters.nature < 0 || filters.nature === state.nature)
  );
}

function pause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}

export class Gen3StaticSearcherUiPreviewEngine implements Gen3StaticSearcherEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen3StaticSearcherRequest,
    options: Gen3StaticSearcherOptions = {},
  ): Promise<Gen3StaticSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 static searcher UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen3StaticSearcherCombinationCount(request);
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
