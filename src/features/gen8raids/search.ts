import type { Gen8RaidRequest, Gen8RaidResult } from "./domain";

export interface Gen8RaidProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen8RaidSummary extends Gen8RaidProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen8RaidSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8RaidResult[]): void;
  onProgress?(progress: Gen8RaidProgress): void;
}
export interface Gen8RaidEngine {
  search(
    request: Gen8RaidRequest,
    options?: Gen8RaidSearchOptions,
  ): Promise<Gen8RaidSummary>;
  cancel(): void;
  dispose(): void;
}
