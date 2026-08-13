import type {
  Gen4SeedToTimeCalibrationRequest,
  Gen4SeedToTimeCalibrationState,
  Gen4SeedToTimeRequest,
  Gen4SeedToTimeState,
  Gen4SeedToTimeStatus,
} from "./domain";

export interface Gen4SeedToTimeSearchSummary {
  states: Gen4SeedToTimeState[];
  status: Gen4SeedToTimeStatus;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen4SeedToTimeCalibrationSummary {
  states: Gen4SeedToTimeCalibrationState[];
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen4SeedToTimeSearchEngine {
  search(request: Gen4SeedToTimeRequest): Promise<Gen4SeedToTimeSearchSummary>;
  calibrate(
    request: Gen4SeedToTimeCalibrationRequest,
  ): Promise<Gen4SeedToTimeCalibrationSummary>;
  dispose(): void;
}
