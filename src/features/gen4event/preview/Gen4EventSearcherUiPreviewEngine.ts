import {
  gen4EventSearcherCombinationCount,
  GEN4_EVENT_MAX_RESULTS,
  type Gen4EventIvTuple,
  type Gen4EventSearcherRequest,
  type Gen4EventSearcherState,
} from "../domain";
import type {
  Gen4EventProgress,
  Gen4EventSearcherEngine,
  Gen4EventSearcherOptions,
  Gen4EventSummary,
} from "../search";
import {
  GEN4_EVENT_PREVIEW_SAMPLE_LIMIT,
  GEN4_EVENT_PREVIEW_STEP_LIMIT,
  gen4EventHiddenPower,
  pause,
} from "./shared";

function ivsAtIndex(request: Gen4EventSearcherRequest, index: number) {
  const ivs: Gen4EventIvTuple = [0, 0, 0, 0, 0, 0];
  for (let stat = 5; stat >= 0; stat--) {
    const width = request.filters.ivMax[stat] - request.filters.ivMin[stat] + 1;
    ivs[stat] = request.filters.ivMin[stat] + (index % width);
    index = Math.floor(index / width);
  }
  return ivs;
}

function previewState(
  request: Gen4EventSearcherRequest,
  combinationIndex: number,
): Gen4EventSearcherState | undefined {
  const ivs = ivsAtIndex(request, combinationIndex);
  let mixed =
    (Math.imul(combinationIndex + 1, 0x045d9f3b) ^
      request.species ^
      Math.imul(request.nature + 1, 0x27d4eb2d)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const effectiveMaxDelay = Math.min(request.maxDelay, 0xffff);
  if (request.minDelay > effectiveMaxDelay) return undefined;
  const delayWidth = effectiveMaxDelay - request.minDelay + 1;
  const delay = request.minDelay + (mixed % delayWidth);
  const hour = (mixed >>> 24) % 24;
  const seed = ((mixed & 0xff000000) | (hour << 16) | (delay & 0xffff)) >>> 0;
  const hiddenPower = gen4EventHiddenPower(ivs);
  return {
    seed,
    delay: seed & 0xffff,
    hour,
    advances:
      request.minAdvance +
      (mixed % (request.maxAdvance - request.minAdvance + 1)),
    ivs,
    hiddenPower: hiddenPower.type,
    hiddenPowerStrength: hiddenPower.strength,
  };
}

export class Gen4EventSearcherUiPreviewEngine implements Gen4EventSearcherEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4EventSearcherRequest,
    options: Gen4EventSearcherOptions = {},
  ): Promise<Gen4EventSummary> {
    if (this.running)
      throw new Error("A Gen4 event search UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen4EventSearcherCombinationCount(request);
    const sampleCount = Math.min(totalStates, GEN4_EVENT_PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, GEN4_EVENT_PREVIEW_STEP_LIMIT);
    const maxResults = Math.min(
      options.maxResults ?? GEN4_EVENT_MAX_RESULTS,
      GEN4_EVENT_MAX_RESULTS,
    );
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen4EventProgress => {
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
        }).filter(
          (state): state is Gen4EventSearcherState =>
            state !== undefined &&
            (request.filters.hiddenPowerMask & (1 << state.hiddenPower)) !== 0,
        );
        const visible = batch.slice(0, Math.max(0, maxResults - resultCount));
        if (visible.length > 0) options.onBatch?.(visible);
        resultCount += visible.length;
        if (visible.length < batch.length) resultLimitReached = true;
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
