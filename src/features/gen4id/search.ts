import type { Gen4IdRequest, Gen4IdState } from "./domain";

export interface Gen4IdProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen4IdSummary extends Gen4IdProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen4IdOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  onBatch?(states: Gen4IdState[]): void;
  onProgress?(progress: Gen4IdProgress): void;
}

export interface Gen4IdEngine {
  search(
    request: Gen4IdRequest,
    options?: Gen4IdOptions,
  ): Promise<Gen4IdSummary>;
  cancel(): void;
  dispose(): void;
}
