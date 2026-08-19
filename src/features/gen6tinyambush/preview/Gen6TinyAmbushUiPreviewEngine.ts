import {
  gen6TinyAmbushTaskCount,
  validateGen6TinyAmbushRequest,
  type Gen6TinyAmbushRequest,
  type Gen6TinyAmbushResult,
} from "../domain";
import type {
  Gen6TinyAmbushEngine,
  Gen6TinyAmbushSearchOptions,
  Gen6TinyAmbushSummary,
} from "../search";

function previewResult(
  request: Gen6TinyAmbushRequest,
  index: number,
): Gen6TinyAmbushResult {
  const random = (Math.imul(index + 1, 0x9e3779b9) ^ request.seed) >>> 0;
  const slot = (random % 12) + 1;
  return {
    index,
    rand100: random % 100,
    state: [0, 0, 0, random],
    initialSeed: request.inputMode === "seed" ? request.seed : 0,
    synchronize: random % 2 === 0,
    slot,
    itemSlot: random % 100 < 50 ? 0 : random % 100 < 55 ? 1 : 2,
    species: request.slots[slot - 1]?.species ?? 0,
    level: request.slots[slot - 1]?.level ?? 1,
  };
}

export class Gen6TinyAmbushUiPreviewEngine implements Gen6TinyAmbushEngine {
  private cancelled = false;

  async search(
    request: Gen6TinyAmbushRequest,
    options: Gen6TinyAmbushSearchOptions = {},
  ): Promise<Gen6TinyAmbushSummary> {
    validateGen6TinyAmbushRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6TinyAmbushTaskCount(request), 5_000);
    const accepted: Gen6TinyAmbushResult[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    try {
      for (
        let offset = 0;
        offset < totalStates && !this.cancelled;
        offset += 1
      ) {
        const result = previewResult(request, request.minIndex + offset);
        const { filters } = request;
        if (
          (filters.disabled ||
            ((!filters.synchronize || result.synchronize) &&
              (filters.slotMask === 0 ||
                (filters.slotMask & (1 << (result.slot - 1))) !== 0))) &&
          accepted.length < request.resultLimit
        )
          accepted.push(result);
        processedStates += 1;
        if (accepted.length >= request.resultLimit) break;
      }
      if (accepted.length) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached: accepted.length >= request.resultLimit,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
