import type {
  Gen3StaticEmeraldRequest,
  Gen3StaticEmeraldState,
  Gen3StaticRequest,
  Gen3StaticState,
} from "./domain";

export interface Gen3StaticSearchProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen3StaticSearchSummary extends Gen3StaticSearchProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen3StaticSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen3StaticState[]): void;
  onProgress?(progress: Gen3StaticSearchProgress): void;
}

export interface Gen3StaticEmeraldSearchOptions extends Omit<
  Gen3StaticSearchOptions,
  "onBatch"
> {
  onBatch?(states: Gen3StaticEmeraldState[]): void;
}

export interface Gen3StaticEmeraldSearchEngine {
  searchEmerald(
    request: Gen3StaticEmeraldRequest,
    options?: Gen3StaticEmeraldSearchOptions,
  ): Promise<Gen3StaticSearchSummary>;
  cancel(): void;
  dispose(): void;
}

export interface Gen3StaticSearchEngine {
  search(
    request: Gen3StaticRequest,
    options?: Gen3StaticSearchOptions,
  ): Promise<Gen3StaticSearchSummary>;
  cancel(): void;
  dispose(): void;
}
