import type {
  Gen6StationaryTimeRequest,
  Gen6StationaryTimeResult,
} from "./timeDomain";

export interface Gen6StationaryTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6StationaryTimeSummary extends Gen6StationaryTimeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6StationaryTimeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen6StationaryTimeResult[]): void;
  onProgress?(progress: Gen6StationaryTimeProgress): void;
}

export interface Gen6StationaryTimeEngine {
  search(
    request: Gen6StationaryTimeRequest,
    options?: Gen6StationaryTimeSearchOptions,
  ): Promise<Gen6StationaryTimeSummary>;
  cancel(): void;
  dispose(): void;
}
