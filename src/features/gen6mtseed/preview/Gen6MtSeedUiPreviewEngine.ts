import {
  gen6MtSeedTaskCount,
  validateGen6MtSeedRequest,
  type Gen6MtSeedRequest,
  type Gen6MtSeedResult,
} from "../domain";
import type {
  Gen6MtSeedEngine,
  Gen6MtSeedSearchOptions,
  Gen6MtSeedSummary,
} from "../search";

function previewResult(
  request: Gen6MtSeedRequest,
  index: number,
): Gen6MtSeedResult {
  const random = (Math.imul(index + 1, 0x9e3779b9) ^ request.startSeed) >>> 0;
  const iv = (offset: number) => (random >>> offset) & 31;
  return {
    seed: (request.startSeed + index) >>> 0,
    frame:
      request.minFrame +
      (index % Math.max(1, request.maxFrame - request.minFrame)),
    pid: random,
    psv: (random >>> 16) ^ (random & 0xffff),
    prv: random & 15,
    ivs: [iv(0), iv(5), iv(10), iv(15), iv(20), iv(25)],
    ivs2: [0, 0, 0, 0, 0, 0],
    nature: random % 25,
    ability: (random % 3) + 1,
    secondary: 0,
    flags: 0,
    aux: 0,
    hordeJumps: [0, 0, 0, 0, 0],
    hordeSpecies: 0,
  };
}

export class Gen6MtSeedUiPreviewEngine implements Gen6MtSeedEngine {
  private cancelled = false;
  async search(
    request: Gen6MtSeedRequest,
    options: Gen6MtSeedSearchOptions = {},
  ): Promise<Gen6MtSeedSummary> {
    validateGen6MtSeedRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6MtSeedTaskCount(request), 5000);
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const results: Gen6MtSeedResult[] = [];
    let processedStates = 0;
    try {
      for (let index = 0; index < totalStates && !this.cancelled; index += 1) {
        results.push(previewResult(request, index));
        processedStates += 1;
        if (results.length >= request.resultLimit) break;
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
