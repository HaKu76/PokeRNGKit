import type {
  Gen5HiddenGrottoPreparedCache,
  Gen5HiddenGrottoRequest,
  Gen5HiddenGrottoResult,
} from "./domain";

export interface Gen5HiddenGrottoProgress {
  processedUnits: number;
  totalUnits: number;
  resultCount: number;
  percent: number;
}

export interface Gen5HiddenGrottoSummary extends Gen5HiddenGrottoProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5HiddenGrottoOptions {
  signal?: AbortSignal;
  workerCount?: number;
  cache?: Gen5HiddenGrottoPreparedCache;
  onBatch?(results: Gen5HiddenGrottoResult[]): void;
  onProgress?(progress: Gen5HiddenGrottoProgress): void;
}

export interface Gen5HiddenGrottoEngine {
  search(
    request: Gen5HiddenGrottoRequest,
    options?: Gen5HiddenGrottoOptions,
  ): Promise<Gen5HiddenGrottoSummary>;
  cancel(): void;
  dispose(): void;
}
