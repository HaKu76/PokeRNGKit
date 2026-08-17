import type { Gen8StaticRequest, Gen8StaticResult } from "./domain";

export interface Gen8StaticProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8StaticSummary extends Gen8StaticProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8StaticSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8StaticResult[]): void;
  onProgress?(progress: Gen8StaticProgress): void;
}

export interface Gen8StaticEngine {
  search(
    request: Gen8StaticRequest,
    options?: Gen8StaticSearchOptions,
  ): Promise<Gen8StaticSummary>;
  cancel(): void;
  dispose(): void;
}
