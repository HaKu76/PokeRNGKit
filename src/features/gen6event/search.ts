import type { Gen6EventRequest, Gen6EventResult } from "./domain";

export interface Gen6EventProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6EventSummary extends Gen6EventProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6EventSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6EventResult[]): void;
  onProgress?(progress: Gen6EventProgress): void;
}

export interface Gen6EventEngine {
  search(
    request: Gen6EventRequest,
    options?: Gen6EventSearchOptions,
  ): Promise<Gen6EventSummary>;
  cancel(): void;
  dispose(): void;
}
