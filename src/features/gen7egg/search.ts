import type { Gen7EggRequest, Gen7EggResult } from "./domain";

export interface Gen7EggProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7EggSummary extends Gen7EggProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
  targetFound: boolean;
  acceptedEggs: number;
  rejectedEggs: number;
}

export interface Gen7EggSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7EggResult[]): void;
  onProgress?(progress: Gen7EggProgress): void;
}

export interface Gen7EggEngine {
  search(
    request: Gen7EggRequest,
    options?: Gen7EggSearchOptions,
  ): Promise<Gen7EggSummary>;
  cancel(): void;
  dispose(): void;
}
