import type { Gen5IvCacheData, Gen5IvCacheRequest } from "./domain";

export interface Gen5IvCacheProgress {
  processedSeeds: number;
  totalSeeds: number;
  resultCount: number;
  percent: number;
}

export interface Gen5IvCacheSummary {
  cache: Gen5IvCacheData;
  processedSeeds: number;
  totalSeeds: number;
  resultCount: number;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen5IvCacheOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onProgress?(progress: Gen5IvCacheProgress): void;
}

export interface Gen5IvCacheEngine {
  search(
    request: Gen5IvCacheRequest,
    options?: Gen5IvCacheOptions,
  ): Promise<Gen5IvCacheSummary>;
  cancel(): void;
  dispose(): void;
}
