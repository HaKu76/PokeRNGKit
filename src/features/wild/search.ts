import type { Gen3WildRequest, Gen3WildState } from "./domain";

export interface Gen3WildSearchProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen3WildSearchSummary extends Gen3WildSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen3WildSearchOptions {
  chunkSize?: number;
  maxResults?: number;
  workerCount?: number;
  signal?: AbortSignal;
  onBatch?(states: Gen3WildState[]): void;
  onProgress?(progress: Gen3WildSearchProgress): void;
}

export interface Gen3WildSearchEngine {
  search(
    request: Gen3WildRequest,
    options?: Gen3WildSearchOptions,
  ): Promise<Gen3WildSearchSummary>;
  cancel(): void;
  dispose(): void;
}
