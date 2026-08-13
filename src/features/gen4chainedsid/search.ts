import type { Gen4ChainedSidRequest } from "./domain";

export interface Gen4ChainedSidSummary {
  candidates: number[];
  processedEntries: number;
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
}

export interface Gen4ChainedSidOptions {
  signal?: AbortSignal;
}

export interface Gen4ChainedSidEngine {
  calculate(
    request: Gen4ChainedSidRequest,
    options?: Gen4ChainedSidOptions,
  ): Promise<Gen4ChainedSidSummary>;
  cancel(): void;
  dispose(): void;
}
