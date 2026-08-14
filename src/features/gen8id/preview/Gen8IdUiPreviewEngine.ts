import {
  GEN8_ID_MAX_RESULTS,
  type Gen8IdRequest,
  type Gen8IdState,
} from "../domain";
import type { Gen8IdEngine, Gen8IdOptions, Gen8IdSummary } from "../search";

function previewState(request: Gen8IdRequest, offset: number): Gen8IdState {
  const advances = (request.initialAdvances + offset) >>> 0;
  const seedWord = Number(
    (request.seed0 ^ (request.seed0 >> 32n) ^ request.seed1) & 0xffff_ffffn,
  );
  let value = (seedWord ^ Math.imul(advances + 1, 0x9e37_79b9)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x85eb_ca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2_ae35) >>> 0;
  const tid = value & 0xffff;
  const sid = value >>> 16;
  return {
    advances,
    tid,
    sid,
    tsv: (tid ^ sid) >>> 4,
    displayTid: value % 1_000_000,
  };
}

function matches(request: Gen8IdRequest, state: Gen8IdState) {
  const { mode, values } = request.filters;
  if (mode === "none" || values.length === 0) return true;
  if (mode === "tid") return values.includes(state.tid);
  if (mode === "sid") return values.includes(state.sid);
  if (mode === "tidSid")
    return values.includes(((state.sid << 16) | state.tid) >>> 0);
  if (mode === "pid")
    return values.some(
      (pid) => ((pid >>> 16) ^ (pid & 0xffff)) >>> 4 === state.tsv,
    );
  if (mode === "tsv") return values.includes(state.tsv);
  return values.includes(state.displayTid);
}

export class Gen8IdUiPreviewEngine implements Gen8IdEngine {
  private cancelled = false;

  async search(
    request: Gen8IdRequest,
    options: Gen8IdOptions = {},
  ): Promise<Gen8IdSummary> {
    const startedAt = performance.now();
    const totalStates = Math.min(request.maxAdvances, 5_000);
    const maxResults = options.maxResults ?? GEN8_ID_MAX_RESULTS;
    const results: Gen8IdState[] = [];
    let processedStates = 0;
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const state = previewState(request, offset);
        processedStates++;
        if (matches(request, state)) results.push(state);
        if (results.length >= maxResults) break;
      }
      options.onBatch?.(results);
      const progress = {
        processedStates,
        totalStates,
        resultCount: results.length,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached:
          results.length >= maxResults && processedStates < totalStates,
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
