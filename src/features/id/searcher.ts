import type { Id3SearcherRequest, Id3SearcherState } from "./domain";

export interface Id3SearcherProgress {
  processedTasks: number;
  totalTasks: number;
  resultCount: number;
  percent: number;
}

export interface Id3SearcherSummary extends Id3SearcherProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Id3SearcherOptions {
  signal?: AbortSignal;
  onBatch?(states: Id3SearcherState[]): void;
  onProgress?(progress: Id3SearcherProgress): void;
}

export interface Id3SearcherEngine {
  search(
    request: Id3SearcherRequest,
    options?: Id3SearcherOptions,
  ): Promise<Id3SearcherSummary>;
  cancel(): void;
  dispose(): void;
}
