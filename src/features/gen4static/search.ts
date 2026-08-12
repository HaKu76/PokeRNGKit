import type { Gen4StaticGeneratorRequest, Gen4StaticState } from "./domain";
export interface Gen4StaticProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface Gen4StaticSummary extends Gen4StaticProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface Gen4StaticOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  maxResults?: number;
  onBatch?(states: Gen4StaticState[]): void;
  onProgress?(progress: Gen4StaticProgress): void;
}
export interface Gen4StaticEngine {
  search(
    request: Gen4StaticGeneratorRequest,
    options?: Gen4StaticOptions,
  ): Promise<Gen4StaticSummary>;
  cancel(): void;
  dispose(): void;
}
