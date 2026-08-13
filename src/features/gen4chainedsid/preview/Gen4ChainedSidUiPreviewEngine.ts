import { GEN4_CHAINED_SID_INITIAL_RESULTS } from "../domain";
import type { Gen4ChainedSidRequest } from "../domain";
import type {
  Gen4ChainedSidEngine,
  Gen4ChainedSidOptions,
  Gen4ChainedSidSummary,
} from "../search";

export class Gen4ChainedSidUiPreviewEngine implements Gen4ChainedSidEngine {
  private cancelled = false;

  async calculate(
    request: Gen4ChainedSidRequest,
    options: Gen4ChainedSidOptions = {},
  ): Promise<Gen4ChainedSidSummary> {
    const startedAt = performance.now();
    this.cancelled = options.signal?.aborted ?? false;
    if (this.cancelled)
      return {
        candidates: [],
        processedEntries: 0,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
      };

    const fixture = request.entries.length === 3 && request.tid === 12345;
    const divisor = Math.max(1, 25 ** request.entries.length);
    const count = Math.max(
      1,
      Math.floor(GEN4_CHAINED_SID_INITIAL_RESULTS / divisor),
    );
    const candidates = fixture
      ? [54320]
      : Array.from({ length: count }, (_, index) => index * 8);
    return {
      candidates,
      processedEntries: request.entries.length,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: false,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
