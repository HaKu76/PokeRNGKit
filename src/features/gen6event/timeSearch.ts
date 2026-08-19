import type { Gen6EventTimeRequest, Gen6EventTimeResult } from "./timeDomain";
export interface Gen6EventTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6EventTimeSummary extends Gen6EventTimeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6EventTimeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(results: Gen6EventTimeResult[]): void;
  onProgress?(progress: Gen6EventTimeProgress): void;
}
export interface Gen6EventTimeEngine {
  search(
    request: Gen6EventTimeRequest,
    options?: Gen6EventTimeSearchOptions,
  ): Promise<Gen6EventTimeSummary>;
  cancel(): void;
  dispose(): void;
}
