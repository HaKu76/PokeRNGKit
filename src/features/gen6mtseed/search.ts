import type { Gen6MtSeedRequest, Gen6MtSeedResult } from "./domain";

export interface Gen6MtSeedProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6MtSeedSummary extends Gen6MtSeedProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6MtSeedSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6MtSeedResult[]): void;
  onProgress?(progress: Gen6MtSeedProgress): void;
}

export interface Gen6MtSeedEngine {
  search(
    request: Gen6MtSeedRequest,
    options?: Gen6MtSeedSearchOptions,
  ): Promise<Gen6MtSeedSummary>;
  cancel(): void;
  dispose(): void;
}
