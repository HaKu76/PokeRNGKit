import type { Gen7EventRequest } from "../domain";

interface Gen7EventWorkerBase {
  moduleId: "gen7event";
  apiVersion: number;
}

export interface Gen7EventWorkerInit extends Gen7EventWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7EventWorkerTask extends Gen7EventWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  request: Gen7EventRequest;
  stepSize: number;
}

export type Gen7EventWorkerRequest = Gen7EventWorkerInit | Gen7EventWorkerTask;

export interface Gen7EventWorkerReady extends Gen7EventWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7EventWorkerBatch extends Gen7EventWorkerBase {
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

export interface Gen7EventWorkerError extends Gen7EventWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7EventWorkerResponse =
  Gen7EventWorkerReady | Gen7EventWorkerBatch | Gen7EventWorkerError;
