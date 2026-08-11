import type { Gen3WildSearcherRequest, Gen3WildSearcherState } from "./domain";
import type { Gen3WildSearchProgress, Gen3WildSearchSummary } from "./search";

export interface Gen3WildSearcherOptions {
  chunkSize?: number;
  maxResults?: number;
  workerCount?: number;
  signal?: AbortSignal;
  onBatch?(states: Gen3WildSearcherState[]): void;
  onProgress?(progress: Gen3WildSearchProgress): void;
}

export interface Gen3WildSearcherEngine {
  search(
    request: Gen3WildSearcherRequest,
    options?: Gen3WildSearcherOptions,
  ): Promise<Gen3WildSearchSummary>;
  cancel(): void;
  dispose(): void;
}
