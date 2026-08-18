import type { Gen6EventRequest } from "../domain";

export interface Gen6EventWorkerBase {
  moduleId: "gen6event";
  apiVersion: number;
}

export interface Gen6EventWorkerInit extends Gen6EventWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen6EventWorkerTask extends Gen6EventWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6EventRequest;
}

export type Gen6EventWorkerRequest = Gen6EventWorkerInit | Gen6EventWorkerTask;

export interface Gen6EventWorkerReady extends Gen6EventWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen6EventWorkerBatch extends Gen6EventWorkerBase {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen6EventWorkerError extends Gen6EventWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen6EventWorkerResponse =
  Gen6EventWorkerReady | Gen6EventWorkerBatch | Gen6EventWorkerError;
