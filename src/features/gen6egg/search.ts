import type { Gen6EggRequest, Gen6EggResult } from "./domain";

export interface Gen6EggProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6EggSummary extends Gen6EggProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6EggSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6EggResult[]): void;
  onProgress?(progress: Gen6EggProgress): void;
}

export interface Gen6EggEngine {
  search(
    request: Gen6EggRequest,
    options?: Gen6EggSearchOptions,
  ): Promise<Gen6EggSummary>;
  cancel(): void;
  dispose(): void;
}
