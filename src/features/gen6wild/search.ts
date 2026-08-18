import type { Gen6WildRequest, Gen6WildResult } from "./domain";

export interface Gen6WildProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6WildSummary extends Gen6WildProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6WildSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6WildResult[]): void;
  onProgress?(progress: Gen6WildProgress): void;
}
export interface Gen6WildEngine {
  search(
    request: Gen6WildRequest,
    options?: Gen6WildSearchOptions,
  ): Promise<Gen6WildSummary>;
  cancel(): void;
  dispose(): void;
}
