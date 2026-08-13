import {
  GEN7_ID_MAX_RESULTS,
  type Gen7IdRequest,
  type Gen7IdState,
} from "../domain";
import type {
  Gen7IdSearchEngine,
  Gen7IdSearchOptions,
  Gen7IdSummary,
} from "../search";

function previewState(request: Gen7IdRequest, advances: number): Gen7IdState {
  let value = (request.seed ^ Math.imul(advances, 0x9e3779b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  const high = Math.imul(value ^ (value >>> 16), 0x27d4eb2d) >>> 0;
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

function matches(request: Gen7IdRequest, state: Gen7IdState) {
  const { mode, value, valueText, tsv, rand } = request.filters;
  if (
    mode === "tid" &&
    !state.tid
      .toString()
      .padStart(5, "0")
      .includes(valueText ?? "")
  )
    return false;
  if (
    mode === "sid" &&
    !state.sid
      .toString()
      .padStart(5, "0")
      .includes(valueText ?? "")
  )
    return false;
  if (mode === "full" && ((state.sid << 16) | state.tid) >>> 0 !== value)
    return false;
  if (
    mode === "g7tid" &&
    !state.g7tid
      .toString()
      .padStart(6, "0")
      .includes(valueText ?? "")
  )
    return false;
  if (tsv !== undefined && state.tsv !== tsv) return false;
  if (
    rand !== undefined &&
    !state.rand64
      .toString(16)
      .toUpperCase()
      .padStart(16, "0")
      .includes(rand.toUpperCase())
  )
    return false;
  return true;
}

export class Gen7IdUiPreviewEngine implements Gen7IdSearchEngine {
  private cancelled = false;
  async search(
    request: Gen7IdRequest,
    options: Gen7IdSearchOptions = {},
  ): Promise<Gen7IdSummary> {
    const startedAt = performance.now();
    const totalStates = Math.min(
      request.maxAdvances - request.minAdvances + 1,
      5_000,
    );
    const maxResults = options.maxResults ?? GEN7_ID_MAX_RESULTS;
    const results: Gen7IdState[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const state = previewState(request, request.minAdvances + offset);
        if (matches(request, state)) results.push(state);
      }
      const accepted = results.slice(0, maxResults);
      options.onBatch?.(accepted);
      const processedStates = this.cancelled ? results.length : totalStates;
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
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
