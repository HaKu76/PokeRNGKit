import type {
  Gen4AdvanceMode,
  Gen4AdvanceRequest,
  Gen4AdvanceToken,
} from "../domain";
import type {
  Gen4AdvanceEngine,
  Gen4AdvanceOptions,
  Gen4AdvanceSummary,
} from "../search";

const chatotRanges = [
  [0, 100],
  [80, 100],
  [60, 80],
  [40, 60],
  [20, 40],
  [0, 20],
  [60, 100],
  [40, 80],
  [20, 60],
  [0, 40],
] as const;

function range(mode: Gen4AdvanceMode, token: Gen4AdvanceToken) {
  if (mode === "calls") return [token, token + 1] as const;
  return chatotRanges[token];
}

export class Gen4AdvanceUiPreviewEngine implements Gen4AdvanceEngine {
  private cancelled = false;

  async search(
    request: Gen4AdvanceRequest,
    options: Gen4AdvanceOptions = {},
  ): Promise<Gen4AdvanceSummary> {
    const startedAt = performance.now();
    this.cancelled = options.signal?.aborted ?? false;
    if (this.cancelled)
      return {
        matches: [],
        rows: request.rows,
        processedRows: 0,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
      };

    const ranges = request.tokens.map((token) => range(request.mode, token));
    const matches = [];
    for (let row = 0; row + ranges.length <= request.rows.length; row++) {
      if (
        ranges.every(([minimum, maximum], offset) => {
          const value = request.rows[row + offset].value;
          return value >= minimum && value < maximum;
        })
      )
        matches.push({ row, advances: request.rows[row].advances });
    }
    return {
      matches,
      rows: request.rows,
      processedRows: request.rows.length,
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
