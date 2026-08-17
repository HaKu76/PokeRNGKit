import type { Gen8EventRequest, Gen8EventResult } from "./domain";

export interface Gen8EventProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8EventSummary extends Gen8EventProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8EventSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8EventResult[]): void;
  onProgress?(progress: Gen8EventProgress): void;
}

export interface Gen8EventEngine {
  search(
    request: Gen8EventRequest,
    options?: Gen8EventSearchOptions,
  ): Promise<Gen8EventSummary>;
  cancel(): void;
  dispose(): void;
}
