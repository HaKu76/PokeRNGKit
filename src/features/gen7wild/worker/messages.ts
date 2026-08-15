import type { RngModuleEnvelope } from "../../shared/rngModuleContract";
import type { Gen7WildRequest } from "../domain";

export interface Gen7WildWorkerInit extends RngModuleEnvelope {
  type: "init";
  moduleId: "gen7wild";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7WildWorkerTask extends RngModuleEnvelope {
  type: "task";
  moduleId: "gen7wild";
  taskId: string;
  operation: "generator";
  request: Gen7WildRequest;
  stepSize: number;
}

export type Gen7WildWorkerRequest = Gen7WildWorkerInit | Gen7WildWorkerTask;

export interface Gen7WildWorkerReady extends RngModuleEnvelope {
  type: "ready";
  moduleId: "gen7wild";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7WildWorkerBatch extends RngModuleEnvelope {
  type: "batch";
  moduleId: "gen7wild";
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

export interface Gen7WildWorkerError extends RngModuleEnvelope {
  type: "error";
  moduleId: "gen7wild";
  taskId?: string;
  message: string;
}

export type Gen7WildWorkerResponse =
  Gen7WildWorkerReady | Gen7WildWorkerBatch | Gen7WildWorkerError;
