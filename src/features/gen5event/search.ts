import type { Gen5EventRequest, Gen5EventResult } from "./domain";

export interface Gen5EventProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5EventSummary extends Gen5EventProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5EventSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(results: Gen5EventResult[]): void;
  onProgress?(progress: Gen5EventProgress): void;
}

export interface Gen5EventEngine {
  search(
    request: Gen5EventRequest,
    options?: Gen5EventSearchOptions,
  ): Promise<Gen5EventSummary>;
  cancel(): void;
  dispose(): void;
}
