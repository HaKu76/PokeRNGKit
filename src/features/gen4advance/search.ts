import type {
  Gen4AdvanceMatch,
  Gen4AdvanceRequest,
  Gen4AdvanceRow,
} from "./domain";

export interface Gen4AdvanceSummary {
  matches: Gen4AdvanceMatch[];
  rows: Gen4AdvanceRow[];
  processedRows: number;
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
}

export interface Gen4AdvanceOptions {
  signal?: AbortSignal;
}

export interface Gen4AdvanceEngine {
  search(
    request: Gen4AdvanceRequest,
    options?: Gen4AdvanceOptions,
  ): Promise<Gen4AdvanceSummary>;
  cancel(): void;
  dispose(): void;
}
