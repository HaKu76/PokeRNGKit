import type { Gen7StationaryRequest, Gen7StationaryResult } from "./domain";

export interface Gen7StationaryProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7StationarySummary extends Gen7StationaryProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7StationarySearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7StationaryResult[]): void;
  onProgress?(progress: Gen7StationaryProgress): void;
}

export interface Gen7StationaryEngine {
  search(
    request: Gen7StationaryRequest,
    options?: Gen7StationarySearchOptions,
  ): Promise<Gen7StationarySummary>;
  cancel(): void;
  dispose(): void;
}
