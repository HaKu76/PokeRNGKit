import type { Gen3EggRequest, Gen3EggState } from "./domain";

export interface Gen3EggSearchProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen3EggSearchSummary extends Gen3EggSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen3EggSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen3EggState[]): void;
  onProgress?(progress: Gen3EggSearchProgress): void;
}

export interface Gen3EggSearchEngine {
  search(
    request: Gen3EggRequest,
    options?: Gen3EggSearchOptions,
  ): Promise<Gen3EggSearchSummary>;
  cancel(): void;
  dispose(): void;
}
