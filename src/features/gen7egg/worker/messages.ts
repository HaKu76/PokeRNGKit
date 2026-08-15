import type { RngModuleEnvelope } from "../../shared/rngModuleContract";
import type { Gen7EggRequest } from "../domain";

export interface Gen7EggWorkerInit extends RngModuleEnvelope {
  type: "init";
  moduleId: "gen7egg";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7EggWorkerTask extends RngModuleEnvelope {
  type: "task";
  moduleId: "gen7egg";
  taskId: string;
  operation: "generator";
  request: Gen7EggRequest;
  stepSize: number;
}

export type Gen7EggWorkerRequest = Gen7EggWorkerInit | Gen7EggWorkerTask;

export interface Gen7EggWorkerReady extends RngModuleEnvelope {
  type: "ready";
  moduleId: "gen7egg";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7EggWorkerBatch extends RngModuleEnvelope {
  type: "batch";
  moduleId: "gen7egg";
  taskId: string;
  operation: "generator";
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
  targetFound: boolean;
  acceptedEggs: number;
  rejectedEggs: number;
}

export interface Gen7EggWorkerError extends RngModuleEnvelope {
  type: "error";
  moduleId: "gen7egg";
  taskId?: string;
  message: string;
}

export type Gen7EggWorkerResponse =
  Gen7EggWorkerReady | Gen7EggWorkerBatch | Gen7EggWorkerError;
