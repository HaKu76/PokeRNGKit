import {
  GEN4_ID_MAX_RESULTS,
  gen4IdTotalStates,
  type Gen4IdRequest,
  type Gen4IdState,
} from "../domain";
import type { Gen4IdEngine, Gen4IdOptions, Gen4IdSummary } from "../search";

function state(request: Gen4IdRequest, index: number): Gen4IdState {
  const delay = request.minDelay + index;
  let seed = Math.imul(delay ^ request.year, 0x6c078965) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b) >>> 0;
  const tid = seed & 0xffff;
  const sid = seed >>> 16;
  return {
    seed,
    delay,
    tid,
    sid,
    tsv: (tid ^ sid) >>> 3,
    seconds: request.operation === "generator" ? index % 60 : undefined,
  };
}

function matches(request: Gen4IdRequest, item: Gen4IdState) {
  const { mode, values } = request.filters;
  if (mode === "none") return true;
  const width = mode === "tidSid" || mode === "tidPid" ? 2 : 1;
  for (let index = 0; index < values.length; index += width) {
    const first = values[index];
    const second = values[index + 1];
    if (
      (mode === "tid" && item.tid === first) ||
      (mode === "sid" && item.sid === first) ||
      (mode === "tidSid" && item.tid === first && item.sid === second) ||
      (mode === "pid" && item.tsv === first) ||
      (mode === "tidPid" && item.tid === first && item.tsv === second) ||
      (mode === "tsv" && item.tsv === first)
    )
      return true;
  }
  return false;
}

export class Gen4IdUiPreviewEngine implements Gen4IdEngine {
  private cancelled = false;

  async search(
    request: Gen4IdRequest,
    options: Gen4IdOptions = {},
  ): Promise<Gen4IdSummary> {
    const startedAt = performance.now();
    const totalStates = Math.min(gen4IdTotalStates(request), 5000);
    const maximum = options.maxResults ?? GEN4_ID_MAX_RESULTS;
    const results: Gen4IdState[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      let processedStates = 0;
      for (
        ;
        processedStates < totalStates && !this.cancelled;
        processedStates++
      ) {
        const next = state(request, processedStates);
        if (matches(request, next)) results.push(next);
      }
      const accepted = results.slice(0, maximum);
      options.onBatch?.(accepted);
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
        resultLimitReached: results.length > maximum,
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
