import type { Gen8UndergroundRequest, Gen8UndergroundResult } from "./domain";

export interface Gen8UndergroundProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8UndergroundSummary extends Gen8UndergroundProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8UndergroundSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8UndergroundResult[]): void;
  onProgress?(progress: Gen8UndergroundProgress): void;
}

export interface Gen8UndergroundEngine {
  search(
    request: Gen8UndergroundRequest,
    options?: Gen8UndergroundSearchOptions,
  ): Promise<Gen8UndergroundSummary>;
  cancel(): void;
  dispose(): void;
}
