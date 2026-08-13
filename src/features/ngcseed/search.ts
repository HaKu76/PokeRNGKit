import type { Gen3NgcSeedRequest, Gen3NgcSeedState } from "./domain";
export interface Gen3NgcSeedSearchProgress {
  processed: number;
  total: number;
  resultCount: number;
  percent: number;
}
export interface Gen3NgcSeedSearchSummary extends Gen3NgcSeedSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}
export interface Gen3NgcSeedSearchOptions {
  signal?: AbortSignal;
  onBatch?(states: Gen3NgcSeedState[]): void;
  onProgress?(progress: Gen3NgcSeedSearchProgress): void;
}
export interface Gen3NgcSeedSearchEngine {
  search(
    request: Gen3NgcSeedRequest,
    options?: Gen3NgcSeedSearchOptions,
  ): Promise<Gen3NgcSeedSearchSummary>;
  cancel(): void;
  dispose(): void;
}
