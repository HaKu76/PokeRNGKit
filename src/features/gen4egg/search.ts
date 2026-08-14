import type {
  Gen4EggGeneratorRequest,
  Gen4EggSearcherRequest,
  Gen4EggSearcherState,
  Gen4EggState,
} from "./domain";

export interface Gen4EggProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen4EggSummary extends Gen4EggProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

interface Gen4EggOptionsBase {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onProgress?(progress: Gen4EggProgress): void;
}

export interface Gen4EggGeneratorOptions extends Gen4EggOptionsBase {
  onBatch?(states: Gen4EggState[]): void;
}

export interface Gen4EggSearcherOptions extends Gen4EggOptionsBase {
  onBatch?(states: Gen4EggSearcherState[]): void;
}

export interface Gen4EggGeneratorEngine {
  search(
    request: Gen4EggGeneratorRequest,
    options?: Gen4EggGeneratorOptions,
  ): Promise<Gen4EggSummary>;
  cancel(): void;
  dispose(): void;
}

export interface Gen4EggSearcherEngine {
  search(
    request: Gen4EggSearcherRequest,
    options?: Gen4EggSearcherOptions,
  ): Promise<Gen4EggSummary>;
  cancel(): void;
  dispose(): void;
}
