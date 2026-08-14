import type {
  Gen5WildPreparedCache,
  Gen5WildRequest,
  Gen5WildResult,
} from "./domain";

export interface Gen5WildProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5WildSummary extends Gen5WildProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5WildOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  cache?: Gen5WildPreparedCache;
  onBatch?(results: Gen5WildResult[]): void;
  onProgress?(progress: Gen5WildProgress): void;
}

export interface Gen5WildEngine {
  search(
    request: Gen5WildRequest,
    options?: Gen5WildOptions,
  ): Promise<Gen5WildSummary>;
  cancel(): void;
  dispose(): void;
}
