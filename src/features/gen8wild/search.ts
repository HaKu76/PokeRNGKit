import type { Gen8WildRequest, Gen8WildResult } from "./domain";

export interface Gen8WildProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8WildSummary extends Gen8WildProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8WildSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8WildResult[]): void;
  onProgress?(progress: Gen8WildProgress): void;
}

export interface Gen8WildEngine {
  search(
    request: Gen8WildRequest,
    options?: Gen8WildSearchOptions,
  ): Promise<Gen8WildSummary>;
  cancel(): void;
  dispose(): void;
}
