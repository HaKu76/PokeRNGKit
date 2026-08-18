import type { Gen6DexNavRequest, Gen6DexNavResult } from "./domain";
export interface Gen6DexNavProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6DexNavSummary extends Gen6DexNavProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6DexNavSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6DexNavResult[]): void;
  onProgress?(progress: Gen6DexNavProgress): void;
}
export interface Gen6DexNavEngine {
  search(
    request: Gen6DexNavRequest,
    options?: Gen6DexNavSearchOptions,
  ): Promise<Gen6DexNavSummary>;
  cancel(): void;
  dispose(): void;
}
