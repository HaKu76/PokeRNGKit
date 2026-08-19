import type { Gen7IdTimeRequest, Gen7IdTimeResult } from "./timeDomain";

export interface Gen7IdTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7IdTimeSummary extends Gen7IdTimeProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7IdTimeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  onBatch?(results: Gen7IdTimeResult[]): void;
  onProgress?(progress: Gen7IdTimeProgress): void;
}

export interface Gen7IdTimeSearchEngine {
  search(
    request: Gen7IdTimeRequest,
    options?: Gen7IdTimeSearchOptions,
  ): Promise<Gen7IdTimeSummary>;
  cancel(): void;
  dispose(): void;
}
