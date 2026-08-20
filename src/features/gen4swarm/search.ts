import type {
  Gen4SwarmAdvanceResult,
  Gen4SwarmRequest,
  Gen4SwarmSeedResult,
} from "./domain";

export interface Gen4SwarmSummary {
  readonly mode: Gen4SwarmRequest["mode"];
  readonly advances: Gen4SwarmAdvanceResult[];
  readonly seeds: Gen4SwarmSeedResult[];
  readonly processedCount: number;
  readonly elapsedMs: number;
  readonly workerCount: 1;
  readonly cancelled: boolean;
}

export interface Gen4SwarmOptions {
  readonly signal?: AbortSignal;
}

export interface Gen4SwarmEngine {
  search(
    request: Gen4SwarmRequest,
    options?: Gen4SwarmOptions,
  ): Promise<Gen4SwarmSummary>;
  cancel(): void;
  dispose(): void;
}
