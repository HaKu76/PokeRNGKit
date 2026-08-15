import type { Gen7StationaryRequest } from "../domain";

interface Gen7StationaryWorkerBase {
  moduleId: "gen7stationary";
  apiVersion: number;
}

export interface Gen7StationaryWorkerInit extends Gen7StationaryWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7StationaryWorkerTask extends Gen7StationaryWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  request: Gen7StationaryRequest;
  stepSize: number;
}

export type Gen7StationaryWorkerRequest =
  Gen7StationaryWorkerInit | Gen7StationaryWorkerTask;

export interface Gen7StationaryWorkerReady extends Gen7StationaryWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7StationaryWorkerBatch extends Gen7StationaryWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7StationaryWorkerError extends Gen7StationaryWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7StationaryWorkerResponse =
  | Gen7StationaryWorkerReady
  | Gen7StationaryWorkerBatch
  | Gen7StationaryWorkerError;
