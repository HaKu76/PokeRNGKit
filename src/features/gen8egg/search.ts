import type { Gen8EggRequest, Gen8EggResult } from "./domain";

export interface Gen8EggProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen8EggSummary extends Gen8EggProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen8EggSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  chunkSize?: number;
  onBatch?(states: Gen8EggResult[]): void;
  onProgress?(progress: Gen8EggProgress): void;
}

export interface Gen8EggEngine {
  search(
    request: Gen8EggRequest,
    options?: Gen8EggSearchOptions,
  ): Promise<Gen8EggSummary>;
  cancel(): void;
  dispose(): void;
}
