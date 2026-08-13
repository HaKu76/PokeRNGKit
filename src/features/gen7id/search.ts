import type { Gen7IdRequest, Gen7IdState } from "./domain";

export interface Gen7IdProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen7IdSummary extends Gen7IdProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen7IdSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen7IdState[]): void;
  onProgress?(progress: Gen7IdProgress): void;
}
export interface Gen7IdSearchEngine {
  search(
    request: Gen7IdRequest,
    options?: Gen7IdSearchOptions,
  ): Promise<Gen7IdSummary>;
  cancel(): void;
  dispose(): void;
}
