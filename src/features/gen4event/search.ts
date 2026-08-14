import type {
  Gen4EventGeneratorRequest,
  Gen4EventSearcherRequest,
  Gen4EventSearcherState,
  Gen4EventState,
} from "./domain";

export interface Gen4EventProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen4EventSummary extends Gen4EventProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

interface Gen4EventBaseOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onProgress?(progress: Gen4EventProgress): void;
}

export interface Gen4EventGeneratorOptions extends Gen4EventBaseOptions {
  onBatch?(states: Gen4EventState[]): void;
}

export interface Gen4EventSearcherOptions extends Gen4EventBaseOptions {
  onBatch?(states: Gen4EventSearcherState[]): void;
}

export interface Gen4EventGeneratorEngine {
  search(
    request: Gen4EventGeneratorRequest,
    options?: Gen4EventGeneratorOptions,
  ): Promise<Gen4EventSummary>;
  cancel(): void;
  dispose(): void;
}

export interface Gen4EventSearcherEngine {
  search(
    request: Gen4EventSearcherRequest,
    options?: Gen4EventSearcherOptions,
  ): Promise<Gen4EventSummary>;
  cancel(): void;
  dispose(): void;
}
