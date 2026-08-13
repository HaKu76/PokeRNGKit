import type { Gen3PokeSpotRequest, Gen3PokeSpotState } from "./domain";

export interface Gen3PokeSpotProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen3PokeSpotSummary extends Gen3PokeSpotProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen3PokeSpotOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  onBatch?(states: Gen3PokeSpotState[]): void;
  onProgress?(progress: Gen3PokeSpotProgress): void;
}

export interface Gen3PokeSpotEngine {
  search(
    request: Gen3PokeSpotRequest,
    options?: Gen3PokeSpotOptions,
  ): Promise<Gen3PokeSpotSummary>;
  cancel(): void;
  dispose(): void;
}
