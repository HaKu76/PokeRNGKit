import {
  gen4StaticSearcherCombinationCount,
  GEN4_STATIC_MAX_RESULTS,
  type Gen4IvTuple,
  type Gen4StaticSearcherRequest,
  type Gen4StaticSearcherState,
} from "../domain";
import type { Gen4StaticProgress, Gen4StaticSummary } from "../search";
import type {
  Gen4StaticSearcherEngine,
  Gen4StaticSearcherOptions,
} from "../searcher";
import {
  hiddenPower,
  matchesFilters,
  pause,
  PREVIEW_SAMPLE_LIMIT,
  PREVIEW_STEP_LIMIT,
  previewGender,
} from "./shared";

function ivsAtIndex(request: Gen4StaticSearcherRequest, index: number) {
  const ivs: Gen4IvTuple = [0, 0, 0, 0, 0, 0];
  for (let stat = 5; stat >= 0; stat--) {
    const size = request.filters.ivMax[stat] - request.filters.ivMin[stat] + 1;
    ivs[stat] = request.filters.ivMin[stat] + (index % size);
    index = Math.floor(index / size);
  }
  return ivs;
}

function previewState(
  request: Gen4StaticSearcherRequest,
  combinationIndex: number,
): Gen4StaticSearcherState {
  const ivs = ivsAtIndex(request, combinationIndex);
  let mixed =
    (Math.imul(combinationIndex + 1, 0x045d9f3b) ^
      request.template.species ^
      request.tid ^
      (request.sid << 16)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const pid = (mixed ^ (mixed >>> 16)) >>> 0;
  const delayWidth = request.maxDelay - request.minDelay + 1;
  const delay = request.minDelay + (mixed % delayWidth);
  const hour = (mixed >>> 24) % 24;
  const seed = ((mixed & 0xff000000) | (hour << 16) | delay) >>> 0;
  const power = hiddenPower(ivs);
  return {
    seed,
    delay,
    hour,
    advances:
      request.minAdvance +
      (mixed % (request.maxAdvance - request.minAdvance + 1)),
    pid,
    ivs,
    ability: pid & 1,
    gender: previewGender(pid, request.template.genderRatio),
    level: request.template.level,
    nature: pid % 25,
    shiny: request.template.shinyLock === "always" ? 1 : 0,
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    call: 0,
    chatot: 0,
  };
}

export class Gen4StaticSearcherUiPreviewEngine implements Gen4StaticSearcherEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4StaticSearcherRequest,
    options: Gen4StaticSearcherOptions = {},
  ): Promise<Gen4StaticSummary> {
    if (this.running) {
      throw new Error("A Gen4 static searcher UI preview is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen4StaticSearcherCombinationCount(request);
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN4_STATIC_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen4StaticProgress => {
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
        }).filter((state) => matchesFilters(request.filters, state));
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
