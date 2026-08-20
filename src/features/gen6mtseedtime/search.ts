import type { Gen6MtSeedTimeRequest, Gen6MtSeedTimeResult } from "./domain";
export interface Gen6MtSeedTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6MtSeedTimeSummary extends Gen6MtSeedTimeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6MtSeedTimeSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6MtSeedTimeResult[]): void;
  onProgress?(progress: Gen6MtSeedTimeProgress): void;
}
export interface Gen6MtSeedTimeEngine {
  search(
    request: Gen6MtSeedTimeRequest,
    options?: Gen6MtSeedTimeSearchOptions,
  ): Promise<Gen6MtSeedTimeSummary>;
  cancel(): void;
  dispose(): void;
}
