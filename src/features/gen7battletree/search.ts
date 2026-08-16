import type { Gen7BattleTreeRequest, Gen7BattleTreeResult } from "./domain";

export interface Gen7BattleTreeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7BattleTreeSummary extends Gen7BattleTreeProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7BattleTreeSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7BattleTreeResult[]): void;
  onProgress?(progress: Gen7BattleTreeProgress): void;
}

export interface Gen7BattleTreeEngine {
  search(
    request: Gen7BattleTreeRequest,
    options?: Gen7BattleTreeSearchOptions,
  ): Promise<Gen7BattleTreeSummary>;
  cancel(): void;
  dispose(): void;
}
