import type { Gen6TinyTimelineRequest, Gen6TinyTimelineResult } from "./domain";

export interface Gen6TinyTimelineProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6TinyTimelineSummary extends Gen6TinyTimelineProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen6TinyTimelineSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6TinyTimelineResult[]): void;
  onProgress?(progress: Gen6TinyTimelineProgress): void;
}

export interface Gen6TinyTimelineEngine {
  search(
    request: Gen6TinyTimelineRequest,
    options?: Gen6TinyTimelineSearchOptions,
  ): Promise<Gen6TinyTimelineSummary>;
  cancel(): void;
  dispose(): void;
}
