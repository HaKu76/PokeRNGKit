import type {
  Gen4SeedToTimeCalibrationRequest,
  Gen4SeedToTimeRequest,
  Gen4SeedToTimeStatus,
} from "../domain";

export type Gen4SeedToTimeWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | { type: "generate"; taskId: string; request: Gen4SeedToTimeRequest }
  | {
      type: "calibrate";
      taskId: string;
      request: Gen4SeedToTimeCalibrationRequest;
    };

export type Gen4SeedToTimeWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "generated";
      taskId: string;
      resultCount: number;
      elapsedMs: number;
      status: Gen4SeedToTimeStatus;
      buffer: ArrayBuffer;
    }
  | {
      type: "calibrated";
      taskId: string;
      resultCount: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | { type: "error"; taskId?: string; code: string; message: string };
