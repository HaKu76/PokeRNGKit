import type {
  Gen7MainQrRequest,
  Gen7MainQrResult,
  Gen7MainSeedRequest,
  Gen7MainSeedResult,
  Gen7MainTimeRequest,
  Gen7MainTimeResult,
} from "./domain";

export interface Gen7MainSeedProgress {
  processedSeeds: number;
  totalSeeds: number;
  resultCount: number;
  percent: number;
}

export interface Gen7MainSeedSummary extends Gen7MainSeedProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen7MainQrSummary {
  results: Gen7MainQrResult[];
  elapsedMs: number;
  cancelled: boolean;
}

export interface Gen7MainTimeSummary {
  result: Gen7MainTimeResult;
  elapsedMs: number;
  cancelled: boolean;
}

export interface Gen7MainSearchOptions {
  signal?: AbortSignal;
  workerCount?: number;
  chunkSize?: number;
  onBatch?(results: Gen7MainSeedResult[]): void;
  onProgress?(progress: Gen7MainSeedProgress): void;
}

export interface Gen7MainEngine {
  searchSeeds(
    request: Gen7MainSeedRequest,
    options?: Gen7MainSearchOptions,
  ): Promise<Gen7MainSeedSummary>;
  searchQr(
    request: Gen7MainQrRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainQrSummary>;
  calculateTime(
    request: Gen7MainTimeRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainTimeSummary>;
  cancel(): void;
  dispose(): void;
}
