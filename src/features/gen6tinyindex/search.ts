import type { Gen6TinyIndexRequest, Gen6TinyIndexResult } from "./domain";

export interface Gen6TinyIndexProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6TinyIndexSummary extends Gen6TinyIndexProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6TinyIndexSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6TinyIndexResult[]): void;
  onProgress?(progress: Gen6TinyIndexProgress): void;
}

export interface Gen6TinyIndexEngine {
  search(
    request: Gen6TinyIndexRequest,
    options?: Gen6TinyIndexSearchOptions,
  ): Promise<Gen6TinyIndexSummary>;
  cancel(): void;
  dispose(): void;
}
