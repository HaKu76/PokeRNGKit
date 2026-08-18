import {
  gen6IdResultPassesFilters,
  gen6IdTaskCount,
  validateGen6IdRequest,
  type Gen6IdRequest,
  type Gen6IdResult,
  type Gen6IdStateTuple,
} from "../domain";
import type {
  Gen6IdEngine,
  Gen6IdSearchOptions,
  Gen6IdSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function preview(request: Gen6IdRequest, frame: number): Gen6IdResult {
  const state = request.state.map((value, index) =>
    mix(value ^ frame ^ Math.imul(index + 1, 0x9e3779b9)),
  ) as Gen6IdStateTuple;
  const random = mix(state[0] ^ state[1] ^ state[2] ^ state[3]);
  const tid = random & 0xffff;
  const sid = random >>> 16;
  const xorValue = tid ^ sid;
  return {
    frame,
    random,
    tid,
    sid,
    tsv: xorValue >>> 4,
    trv: xorValue & 15,
    state,
  };
}

export class Gen6IdUiPreviewEngine implements Gen6IdEngine {
  private cancelled = false;

  async search(
    request: Gen6IdRequest,
    options: Gen6IdSearchOptions = {},
  ): Promise<Gen6IdSummary> {
    validateGen6IdRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6IdTaskCount(request), 512);
    const results: Gen6IdResult[] = [];
    let processedStates = 0;
    this.cancelled = options.signal?.aborted ?? false;
    for (let index = 0; index < totalStates && !this.cancelled; ++index) {
      const result = preview(request, request.minFrame + index);
      processedStates += 1;
      if (gen6IdResultPassesFilters(request, result)) results.push(result);
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
