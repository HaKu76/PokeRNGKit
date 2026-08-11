import type {
  Gen3StaticSearcherRequest,
  Gen3StaticSearcherState,
} from "./domain";
import type {
  Gen3StaticSearchProgress,
  Gen3StaticSearchSummary,
} from "./search";

export interface Gen3StaticSearcherOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen3StaticSearcherState[]): void;
  onProgress?(progress: Gen3StaticSearchProgress): void;
}

export interface Gen3StaticSearcherEngine {
  search(
    request: Gen3StaticSearcherRequest,
    options?: Gen3StaticSearcherOptions,
  ): Promise<Gen3StaticSearchSummary>;
  cancel(): void;
  dispose(): void;
}
