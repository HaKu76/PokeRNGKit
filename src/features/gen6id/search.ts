import type { Gen6IdRequest, Gen6IdResult } from "./domain";

export interface Gen6IdProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6IdSummary extends Gen6IdProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6IdSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6IdResult[]): void;
  onProgress?(progress: Gen6IdProgress): void;
}

export interface Gen6IdEngine {
  search(
    request: Gen6IdRequest,
    options?: Gen6IdSearchOptions,
  ): Promise<Gen6IdSummary>;
  cancel(): void;
  dispose(): void;
}
