import type { Gen8IdRequest, Gen8IdState } from "./domain";

export interface Gen8IdProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8IdSummary extends Gen8IdProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8IdOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8IdState[]): void;
  onProgress?(progress: Gen8IdProgress): void;
}

export interface Gen8IdEngine {
  search(
    request: Gen8IdRequest,
    options?: Gen8IdOptions,
  ): Promise<Gen8IdSummary>;
  cancel(): void;
  dispose(): void;
}
