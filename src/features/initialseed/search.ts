import type { Gen3InitialSeedState } from "./domain";

export interface Gen3InitialSeedSearchProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen3InitialSeedSearchSummary
  extends Gen3InitialSeedSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen3InitialSeedSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  onBatch?(states: Gen3InitialSeedState[]): void;
  onProgress?(progress: Gen3InitialSeedSearchProgress): void;
}
