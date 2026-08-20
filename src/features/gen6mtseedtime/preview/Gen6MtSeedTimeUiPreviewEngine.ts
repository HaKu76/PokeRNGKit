import {
  gen6MtSeedTimeTaskCount,
  validateGen6MtSeedTimeRequest,
  type Gen6MtSeedTimeRequest,
  type Gen6MtSeedTimeResult,
} from "../domain";
import type {
  Gen6MtSeedTimeEngine,
  Gen6MtSeedTimeSearchOptions,
  Gen6MtSeedTimeSummary,
} from "../search";
function previewResult(
  request: Gen6MtSeedTimeRequest,
  offset: number,
): Gen6MtSeedTimeResult {
  const epoch = request.epoch + BigInt(offset) * 1000n;
  return {
    epoch,
    frame300Seed: (request.frame300Seed + offset * 1000) >>> 0,
    saveFrame: (request.game === "xy" ? 23 : 25) * -1,
    savePar: request.targetSeed,
    offsetSeconds: offset,
    mode: request.mode,
    game: request.game,
  };
}
export class Gen6MtSeedTimeUiPreviewEngine implements Gen6MtSeedTimeEngine {
  private cancelled = false;
  async search(
    request: Gen6MtSeedTimeRequest,
    options: Gen6MtSeedTimeSearchOptions = {},
  ): Promise<Gen6MtSeedTimeSummary> {
    validateGen6MtSeedTimeRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6MtSeedTimeTaskCount(request), 5000);
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const results: Gen6MtSeedTimeResult[] = [];
    let processedStates = 0;
    try {
      for (
        let index = 0;
        index < totalStates &&
        !this.cancelled &&
        results.length < request.resultLimit;
        index += 1
      ) {
        results.push(previewResult(request, index));
        processedStates += 1;
      }
      if (results.length) options.onBatch?.(results);
      const progress = {
        processedStates,
        totalStates,
        resultCount: results.length,
        percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached: results.length >= request.resultLimit,
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
