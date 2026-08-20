import type { ThreeDsProfileCalibratorRequest } from "./calibratorDomain";

interface CalibratorMessageBase {
  moduleId: "3ds-profile-calibrator";
  apiVersion: number;
}

export interface ThreeDsProfileCalibratorInit extends CalibratorMessageBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface ThreeDsProfileCalibratorTask extends CalibratorMessageBase {
  type: "task";
  taskId: string;
  operation: "profile-calibration";
  request: ThreeDsProfileCalibratorRequest;
  stepSize: number;
}

export type ThreeDsProfileCalibratorRequestMessage =
  ThreeDsProfileCalibratorInit | ThreeDsProfileCalibratorTask;

export interface ThreeDsProfileCalibratorReady extends CalibratorMessageBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["profile-calibration"];
}

export interface ThreeDsProfileCalibratorBatch extends CalibratorMessageBase {
  type: "batch";
  taskId: string;
  operation: "profile-calibration";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface ThreeDsProfileCalibratorError extends CalibratorMessageBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type ThreeDsProfileCalibratorResponse =
  | ThreeDsProfileCalibratorReady
  | ThreeDsProfileCalibratorBatch
  | ThreeDsProfileCalibratorError;
