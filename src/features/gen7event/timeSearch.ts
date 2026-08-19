import type { Gen7EventTimeRequest, Gen7EventTimeResult } from "./timeDomain";

export interface Gen7EventTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7EventTimeSummary extends Gen7EventTimeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7EventTimeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7EventTimeResult[]): void;
  onProgress?(progress: Gen7EventTimeProgress): void;
}

export interface Gen7EventTimeEngine {
  search(
    request: Gen7EventTimeRequest,
    options?: Gen7EventTimeSearchOptions,
  ): Promise<Gen7EventTimeSummary>;
  cancel(): void;
  dispose(): void;
}
