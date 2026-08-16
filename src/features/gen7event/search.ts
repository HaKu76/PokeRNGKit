import type { Gen7EventRequest, Gen7EventResult } from "./domain";

export interface Gen7EventProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7EventSummary extends Gen7EventProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7EventSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7EventResult[]): void;
  onProgress?(progress: Gen7EventProgress): void;
}

export interface Gen7EventEngine {
  search(
    request: Gen7EventRequest,
    options?: Gen7EventSearchOptions,
  ): Promise<Gen7EventSummary>;
  cancel(): void;
  dispose(): void;
}
