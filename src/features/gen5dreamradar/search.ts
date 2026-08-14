import type { Gen5DreamRadarRequest, Gen5DreamRadarResult } from "./domain";

export interface Gen5DreamRadarProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5DreamRadarSummary extends Gen5DreamRadarProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5DreamRadarOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onBatch?(results: Gen5DreamRadarResult[]): void;
  onProgress?(progress: Gen5DreamRadarProgress): void;
}

export interface Gen5DreamRadarEngine {
  search(
    request: Gen5DreamRadarRequest,
    options?: Gen5DreamRadarOptions,
  ): Promise<Gen5DreamRadarSummary>;
  cancel(): void;
  dispose(): void;
}
