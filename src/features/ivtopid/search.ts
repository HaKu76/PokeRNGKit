import type { Gen3IvToPidRequest, Gen3IvToPidState } from "./domain";

export interface Gen3IvToPidSearchProgress {
  processed: number;
  resultCount: number;
  percent: number;
}

export interface Gen3IvToPidSearchSummary extends Gen3IvToPidSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen3IvToPidSearchOptions {
  signal?: AbortSignal;
  onBatch?(states: Gen3IvToPidState[]): void;
  onProgress?(progress: Gen3IvToPidSearchProgress): void;
}

export interface Gen3IvToPidSearchEngine {
  search(
    request: Gen3IvToPidRequest,
    options?: Gen3IvToPidSearchOptions,
  ): Promise<Gen3IvToPidSearchSummary>;
  cancel(): void;
  dispose(): void;
}
