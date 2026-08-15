import type { Gen7WildRequest, Gen7WildResult } from "./domain";

export interface Gen7WildProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7WildSummary extends Gen7WildProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7WildSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7WildResult[]): void;
  onProgress?(progress: Gen7WildProgress): void;
}

export interface Gen7WildEngine {
  search(
    request: Gen7WildRequest,
    options?: Gen7WildSearchOptions,
  ): Promise<Gen7WildSummary>;
  cancel(): void;
  dispose(): void;
}
