import type { RngModuleEnvelope } from "../../shared/rngModuleContract";
import type { Gen7SosRequest } from "../domain";

export interface Gen7SosWorkerInit extends RngModuleEnvelope {
  type: "init";
  moduleId: "gen7sos";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7SosWorkerTask extends RngModuleEnvelope {
  type: "task";
  moduleId: "gen7sos";
  taskId: string;
  operation: "generator";
  request: Gen7SosRequest;
  stepSize: number;
}

export type Gen7SosWorkerRequest = Gen7SosWorkerInit | Gen7SosWorkerTask;

export interface Gen7SosWorkerReady extends RngModuleEnvelope {
  type: "ready";
  moduleId: "gen7sos";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7SosWorkerBatch extends RngModuleEnvelope {
  type: "batch";
  moduleId: "gen7sos";
  taskId: string;
  operation: "generator";
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7SosWorkerError extends RngModuleEnvelope {
  type: "error";
  moduleId: "gen7sos";
  taskId?: string;
  message: string;
}

export type Gen7SosWorkerResponse =
  Gen7SosWorkerReady | Gen7SosWorkerBatch | Gen7SosWorkerError;
