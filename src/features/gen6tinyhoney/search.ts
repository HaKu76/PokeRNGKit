import type { Gen6TinyHoneyRequest, Gen6TinyHoneyResult } from "./domain";

export interface Gen6TinyHoneyProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6TinyHoneySummary extends Gen6TinyHoneyProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface gen6TinyHoneySearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6TinyHoneyResult[]): void;
  onProgress?(progress: Gen6TinyHoneyProgress): void;
}

export interface Gen6TinyHoneyEngine {
  search(
    request: Gen6TinyHoneyRequest,
    options?: gen6TinyHoneySearchOptions,
  ): Promise<Gen6TinyHoneySummary>;
  cancel(): void;
  dispose(): void;
}
