import type { Gen7SosRequest, Gen7SosResult } from "./domain";

export interface Gen7SosProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7SosSummary extends Gen7SosProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7SosSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7SosResult[]): void;
  onProgress?(progress: Gen7SosProgress): void;
}

export interface Gen7SosEngine {
  search(
    request: Gen7SosRequest,
    options?: Gen7SosSearchOptions,
  ): Promise<Gen7SosSummary>;
  cancel(): void;
  dispose(): void;
}
