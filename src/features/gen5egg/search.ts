import type { Gen5EggRequest, Gen5EggResult } from "./domain";

export interface Gen5EggProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5EggSummary extends Gen5EggProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5EggSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(results: Gen5EggResult[]): void;
  onProgress?(progress: Gen5EggProgress): void;
}

export interface Gen5EggEngine {
  search(
    request: Gen5EggRequest,
    options?: Gen5EggSearchOptions,
  ): Promise<Gen5EggSummary>;
  cancel(): void;
  dispose(): void;
}
