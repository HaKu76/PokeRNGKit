import type { Gen5IdRequest, Gen5IdResult } from "./domain";

export interface Gen5IdProgress {
  processedSeeds: number;
  totalSeeds: number;
  resultCount: number;
  percent: number;
}

export interface Gen5IdSummary extends Gen5IdProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5IdOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onBatch?(results: Gen5IdResult[]): void;
  onProgress?(progress: Gen5IdProgress): void;
}

export interface Gen5IdEngine {
  search(
    request: Gen5IdRequest,
    options?: Gen5IdOptions,
  ): Promise<Gen5IdSummary>;
  cancel(): void;
  dispose(): void;
}
