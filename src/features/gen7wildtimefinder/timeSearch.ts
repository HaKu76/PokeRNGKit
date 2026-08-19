import type { Gen7WildTimeRequest, Gen7WildTimeResult } from "./timeDomain";

export interface Gen7WildTimeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen7WildTimeSummary extends Gen7WildTimeProgress {
  elapsedMs: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen7WildTimeEngine {
  search(
    request: Gen7WildTimeRequest,
    options?: {
      signal?: AbortSignal;
      onBatch?(results: Gen7WildTimeResult[]): void;
      onProgress?(progress: Gen7WildTimeProgress): void;
    },
  ): Promise<Gen7WildTimeSummary>;
  cancel(): void;
  dispose(): void;
}
