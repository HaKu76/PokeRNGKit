import type { Gen6StationaryRequest, Gen6StationaryResult } from "./domain";

export interface Gen6StationaryProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6StationarySummary extends Gen6StationaryProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6StationarySearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6StationaryResult[]): void;
  onProgress?(progress: Gen6StationaryProgress): void;
}
export interface Gen6StationaryEngine {
  search(
    request: Gen6StationaryRequest,
    options?: Gen6StationarySearchOptions,
  ): Promise<Gen6StationarySummary>;
  cancel(): void;
  dispose(): void;
}
