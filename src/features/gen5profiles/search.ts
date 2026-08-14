import type { Gen5CalibrationRequest, Gen5CalibrationResult } from "./domain";

export interface Gen5CalibrationProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen5CalibrationSummary {
  results: Gen5CalibrationResult[];
  processedStates: number;
  totalStates: number;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}

export interface Gen5CalibrationOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onProgress?(progress: Gen5CalibrationProgress): void;
}

export interface Gen5CalibrationEngine {
  search(
    request: Gen5CalibrationRequest,
    options?: Gen5CalibrationOptions,
  ): Promise<Gen5CalibrationSummary>;
  cancel(): void;
  dispose(): void;
}
