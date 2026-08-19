import {
  gen6TinyIndexResultPassesFilters,
  gen6TinyIndexTaskCount,
  validateGen6TinyIndexRequest,
  type Gen6TinyIndexRequest,
  type Gen6TinyIndexResult,
  type Gen6TinyIndexState,
} from "../domain";
import type {
  Gen6TinyIndexEngine,
  Gen6TinyIndexSearchOptions,
  Gen6TinyIndexSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function preview(
  request: Gen6TinyIndexRequest,
  index: number,
  elapsedSecond: number,
): Gen6TinyIndexResult {
  const seed =
    request.mode === "date"
      ? (request.baseSeed + Math.imul(elapsedSecond, 1_000)) >>> 0
      : 0;
  const state = request.state.map((value, word) =>
    mix(value ^ seed ^ index ^ Math.imul(word + 1, 0x9e3779b9)),
  ) as Gen6TinyIndexState;
  return {
    index,
    random: mix(state[0] ^ state[1] ^ state[2] ^ state[3]),
    state,
    initialSeed: seed,
    elapsedSecond,
  };
}

export class Gen6TinyIndexUiPreviewEngine implements Gen6TinyIndexEngine {
  private cancelled = false;

  async search(
    request: Gen6TinyIndexRequest,
    options: Gen6TinyIndexSearchOptions = {},
  ): Promise<Gen6TinyIndexSummary> {
    validateGen6TinyIndexRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6TinyIndexTaskCount(request), 512);
    const results: Gen6TinyIndexResult[] = [];
    const indexes = request.maxIndex - request.minIndex + 1;
    let processedStates = 0;
    this.cancelled = options.signal?.aborted ?? false;
    for (let offset = 0; offset < totalStates && !this.cancelled; ++offset) {
      const index = request.minIndex + (offset % indexes);
      const elapsedSecond =
        request.mode === "date"
          ? request.startSecond + Math.floor(offset / indexes)
          : 0;
      const result = preview(request, index, elapsedSecond);
      processedStates += 1;
      if (gen6TinyIndexResultPassesFilters(request, result))
        results.push(result);
      if (results.length >= request.resultLimit) break;
    }
    if (results.length) options.onBatch?.(results);
    const limitReached = results.length >= request.resultLimit;
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
      resultLimitReached: limitReached && processedStates < totalStates,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
