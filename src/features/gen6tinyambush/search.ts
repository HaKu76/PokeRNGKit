import type { Gen6TinyAmbushRequest, Gen6TinyAmbushResult } from "./domain";

export interface Gen6TinyAmbushProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6TinyAmbushSummary extends Gen6TinyAmbushProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6TinyAmbushSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6TinyAmbushResult[]): void;
  onProgress?(progress: Gen6TinyAmbushProgress): void;
}

export interface Gen6TinyAmbushEngine {
  search(
    request: Gen6TinyAmbushRequest,
    options?: Gen6TinyAmbushSearchOptions,
  ): Promise<Gen6TinyAmbushSummary>;
  cancel(): void;
  dispose(): void;
}
