import type { Gen5Sha1CacheData, Gen5Sha1CacheRequest } from "./domain";

export interface Gen5Sha1CacheProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5Sha1CacheSummary extends Gen5Sha1CacheProgress {
  cache: Gen5Sha1CacheData;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen5Sha1CacheOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onProgress?(progress: Gen5Sha1CacheProgress): void;
}

export interface Gen5Sha1CacheEngine {
  search(
    request: Gen5Sha1CacheRequest,
    options?: Gen5Sha1CacheOptions,
  ): Promise<Gen5Sha1CacheSummary>;
  cancel(): void;
  dispose(): void;
}
