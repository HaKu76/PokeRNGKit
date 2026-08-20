import type { Gen4SeedFinderRequest, Gen4SeedFinderResult } from "./domain";

export interface Gen4SeedFinderSummary {
  readonly results: Gen4SeedFinderResult[];
  readonly elapsedMs: number;
  readonly workerCount: number;
  readonly cancelled: boolean;
}

export interface Gen4SeedFinderEngine {
  search(
    request: Gen4SeedFinderRequest,
    options?: { signal?: AbortSignal },
  ): Promise<Gen4SeedFinderSummary>;
  cancel(): void;
  dispose(): void;
}
