import {
  createGen7IdStateMatcher,
  GEN7_ID_MAX_RESULTS,
  type Gen7IdState,
} from "../../gen7id/domain";
import {
  gen7IdTimeTaskCount,
  validateGen7IdTimeRequest,
  type Gen7IdTimeRequest,
  type Gen7IdTimeResult,
} from "../timeDomain";
import type {
  Gen7IdTimeProgress,
  Gen7IdTimeSearchEngine,
  Gen7IdTimeSearchOptions,
  Gen7IdTimeSummary,
} from "../timeSearch";

function previewState(
  request: Gen7IdTimeRequest,
  seed: number,
  advances: number,
): Gen7IdState {
  let value = (seed ^ Math.imul(advances, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  const high = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  const rand64 = (BigInt(high) << 32n) | BigInt(value);
  const tid = value & 0xffff;
  const sid = value >>> 16;
  const xorValue = tid ^ sid;
  return {
    advances,
    rand64,
    tid,
    sid,
    tsv: xorValue >>> 4,
    trv: xorValue & 0xf,
    g7tid: (((sid << 16) | tid) >>> 0) % 1_000_000,
    clock: Number(((rand64 % 17n) + BigInt(request.correction)) % 17n),
  };
}

export class Gen7IdTimeUiPreviewEngine implements Gen7IdTimeSearchEngine {
  private cancelled = false;

  async search(
    request: Gen7IdTimeRequest,
    options: Gen7IdTimeSearchOptions = {},
  ): Promise<Gen7IdTimeSummary> {
    validateGen7IdTimeRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7IdTimeTaskCount(request), 5_000);
    const maxResults = options.maxResults ?? GEN7_ID_MAX_RESULTS;
    const matches = createGen7IdStateMatcher(request.filters);
    const results: Gen7IdTimeResult[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      const frameCount = request.maxFrame - request.minFrame + 1;
      for (let index = 0; index < totalStates && !this.cancelled; index++) {
        const second = Math.floor(index / frameCount);
        const frameOffset = index % frameCount;
        const epoch = request.startEpoch + BigInt(second * 1000);
        const seed =
          Number((BigInt(request.tick) + BigInt(index + 1)) & 0xffff_ffffn) >>>
          0;
        const state = previewState(
          request,
          seed,
          request.minFrame + frameOffset,
        );
        if (matches(state))
          results.push({ ...state, initialSeed: seed, epoch });
      }
      const accepted = results.slice(0, maxResults);
      options.onBatch?.(accepted);
      const progress: Gen7IdTimeProgress = {
        processedStates: this.cancelled ? 0 : totalStates,
        totalStates,
        resultCount: accepted.length,
        percent: totalStates === 0 ? 100 : (totalStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached: results.length > maxResults,
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
