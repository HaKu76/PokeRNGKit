import type { Gen6IdRequest } from "../domain";

interface Gen6IdWorkerBase {
  moduleId: "gen6id";
  apiVersion: number;
}

export interface Gen6IdWorkerInit extends Gen6IdWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen6IdWorkerTask extends Gen6IdWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6IdRequest;
  stepSize: number;
}

export type Gen6IdWorkerRequest = Gen6IdWorkerInit | Gen6IdWorkerTask;

export interface Gen6IdWorkerReady extends Gen6IdWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen6IdWorkerBatch extends Gen6IdWorkerBase {
  type: "batch";
  taskId: string;
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen6IdWorkerError extends Gen6IdWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen6IdWorkerResponse =
  Gen6IdWorkerReady | Gen6IdWorkerBatch | Gen6IdWorkerError;
