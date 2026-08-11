import type { Id3Request, Id3State } from "./domain";

export interface Id3SearchProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Id3SearchSummary extends Id3SearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Id3SearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Id3State[]): void;
  onProgress?(progress: Id3SearchProgress): void;
}

export interface Id3SearchEngine {
  search(
    request: Id3Request,
    options?: Id3SearchOptions,
  ): Promise<Id3SearchSummary>;
  cancel(): void;
  dispose(): void;
}
