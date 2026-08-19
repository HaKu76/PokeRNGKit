import type {
  Gen6TinyRockSmashRequest,
  Gen6TinyRockSmashResult,
} from "./domain";

export interface Gen6TinyRockSmashProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6TinyRockSmashSummary extends Gen6TinyRockSmashProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6TinyRockSmashSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6TinyRockSmashResult[]): void;
  onProgress?(progress: Gen6TinyRockSmashProgress): void;
}

export interface Gen6TinyRockSmashEngine {
  search(
    request: Gen6TinyRockSmashRequest,
    options?: Gen6TinyRockSmashSearchOptions,
  ): Promise<Gen6TinyRockSmashSummary>;
  cancel(): void;
  dispose(): void;
}
