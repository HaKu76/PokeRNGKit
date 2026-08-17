import type {
  Gen7FestivalPlazaRequest,
  Gen7FestivalPlazaResult,
} from "./domain";

export interface Gen7FestivalPlazaProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen7FestivalPlazaSummary extends Gen7FestivalPlazaProgress {
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen7FestivalPlazaSearchOptions {
  signal?: AbortSignal;
  maxResults?: number;
  stepSize?: number;
  onBatch?(states: Gen7FestivalPlazaResult[]): void;
  onProgress?(progress: Gen7FestivalPlazaProgress): void;
}

export interface Gen7FestivalPlazaEngine {
  search(
    request: Gen7FestivalPlazaRequest,
    options?: Gen7FestivalPlazaSearchOptions,
  ): Promise<Gen7FestivalPlazaSummary>;
  cancel(): void;
  dispose(): void;
}
