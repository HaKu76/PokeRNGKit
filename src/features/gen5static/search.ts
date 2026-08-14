import type {
  Gen5StaticPreparedCache,
  Gen5StaticRequest,
  Gen5StaticResult,
} from "./domain";

export interface Gen5StaticProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5StaticSummary extends Gen5StaticProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5StaticOptions {
  signal?: AbortSignal;
  workerCount?: number;
  cache?: Gen5StaticPreparedCache;
  onBatch?(results: Gen5StaticResult[]): void;
  onProgress?(progress: Gen5StaticProgress): void;
}

export interface Gen5StaticEngine {
  search(
    request: Gen5StaticRequest,
    options?: Gen5StaticOptions,
  ): Promise<Gen5StaticSummary>;
  cancel(): void;
  dispose(): void;
}
