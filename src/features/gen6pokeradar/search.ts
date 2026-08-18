import type { Gen6PokeRadarRequest, Gen6PokeRadarResult } from "./domain";
export interface Gen6PokeRadarProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen6PokeRadarSummary extends Gen6PokeRadarProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen6PokeRadarSearchOptions {
  signal?: AbortSignal;
  onBatch?(results: Gen6PokeRadarResult[]): void;
  onProgress?(progress: Gen6PokeRadarProgress): void;
}
export interface Gen6PokeRadarEngine {
  search(
    request: Gen6PokeRadarRequest,
    options?: Gen6PokeRadarSearchOptions,
  ): Promise<Gen6PokeRadarSummary>;
  cancel(): void;
  dispose(): void;
}
