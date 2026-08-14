import {
  GEN4_EVENT_MAX_RESULTS,
  type Gen4EventGeneratorRequest,
  type Gen4EventIvTuple,
  type Gen4EventState,
} from "../domain";
import type {
  Gen4EventGeneratorEngine,
  Gen4EventGeneratorOptions,
  Gen4EventProgress,
  Gen4EventSummary,
} from "../search";
import {
  GEN4_EVENT_PREVIEW_SAMPLE_LIMIT,
  GEN4_EVENT_PREVIEW_STEP_LIMIT,
  gen4EventHiddenPower,
  pause,
} from "./shared";

function previewState(
  request: Gen4EventGeneratorRequest,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Gen4EventState {
  const offset =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const advances = request.initialAdvances + offset;
  let mixed =
    (request.seed ^
      Math.imul(advances + request.offset, 0x045d9f3b) ^
      request.species ^
      Math.imul(request.nature + 1, 0x27d4eb2d)) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const ivs: Gen4EventIvTuple = [
    mixed & 31,
    (mixed >>> 5) & 31,
    (mixed >>> 10) & 31,
    (mixed >>> 15) & 31,
    (mixed >>> 20) & 31,
    (mixed >>> 25) & 31,
  ];
  const hiddenPower = gen4EventHiddenPower(ivs);
  return {
    advances,
    ivs,
    hiddenPower: hiddenPower.type,
    hiddenPowerStrength: hiddenPower.strength,
    call: mixed % 3,
    chatot: Math.trunc(((mixed % 8192) * 100) / 8192),
  };
}

export class Gen4EventUiPreviewEngine implements Gen4EventGeneratorEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4EventGeneratorRequest,
    options: Gen4EventGeneratorOptions = {},
  ): Promise<Gen4EventSummary> {
    if (this.running)
      throw new Error("A Gen4 event UI preview is already running.");
    this.running = true;
    const startedAt = performance.now();
    const totalStates = request.maxAdvances + 1;
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
        const batch = Array.from({ length: end - start }, (_, index) =>
          previewState(request, start + index, sampleCount, totalStates),
        ).filter((state) =>
          state.ivs.every(
            (value, index) =>
              value >= request.filters.ivMin[index] &&
              value <= request.filters.ivMax[index],
          ),
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
