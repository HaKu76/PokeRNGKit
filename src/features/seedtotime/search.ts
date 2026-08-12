import type {
  Gen3SeedToTimeRequest,
  Gen3SeedToTimeResult,
} from "./domain";

export interface Gen3SeedToTimeSearchSummary extends Gen3SeedToTimeResult {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen3SeedToTimeSearchOptions {
  signal?: AbortSignal;
}

export interface Gen3SeedToTimeSearchEngine {
  search(
    request: Gen3SeedToTimeRequest,
    options?: Gen3SeedToTimeSearchOptions,
  ): Promise<Gen3SeedToTimeSearchSummary>;
  cancel(): void;
  dispose(): void;
}
