import type {
  Gen4StaticSearcherRequest,
  Gen4StaticSearcherState,
} from "./domain";
import type { Gen4StaticProgress, Gen4StaticSummary } from "./search";
export interface Gen4StaticSearcherOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen4StaticSearcherState[]): void;
  onProgress?(progress: Gen4StaticProgress): void;
}
export interface Gen4StaticSearcherEngine {
  search(
    request: Gen4StaticSearcherRequest,
    options?: Gen4StaticSearcherOptions,
  ): Promise<Gen4StaticSummary>;
  cancel(): void;
  dispose(): void;
}
