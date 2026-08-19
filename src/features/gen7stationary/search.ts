import type {
  Gen7StationaryRequest,
  Gen7StationaryResult,
  Gen7StationaryTimeRequest,
  Gen7StationaryTimeResult,
} from "./domain";

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

export interface Gen7StationaryTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7StationaryTimeSummary extends Gen7StationaryTimeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7StationaryTimeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7StationaryTimeResult[]): void;
  onProgress?(progress: Gen7StationaryTimeProgress): void;
}

export interface Gen7StationaryTimeEngine {
  search(
    request: Gen7StationaryTimeRequest,
    options?: Gen7StationaryTimeSearchOptions,
  ): Promise<Gen7StationaryTimeSummary>;
  cancel(): void;
  dispose(): void;
}
