import type { Gen6TinyHoneyRequest } from "../domain";

interface WorkerBase {
  moduleId: "gen6tinyhoney";
  apiVersion: number;
}
export interface Gen6TinyHoneyWorkerInit extends WorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6TinyHoneyWorkerTask extends WorkerBase {
  type: "task";
  taskId: string;
  request: Gen6TinyHoneyRequest;
  stepSize: number;
}
export type Gen6TinyHoneyWorkerRequest =
  Gen6TinyHoneyWorkerInit | Gen6TinyHoneyWorkerTask;
export interface Gen6TinyHoneyWorkerReady extends WorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6TinyHoneyWorkerBatch extends WorkerBase {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  batchIndex: number;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}
export interface Gen6TinyHoneyWorkerError extends WorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6TinyHoneyWorkerResponse =
  | Gen6TinyHoneyWorkerReady
  | Gen6TinyHoneyWorkerBatch
  | Gen6TinyHoneyWorkerError;
