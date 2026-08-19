import type { Gen6TinyAmbushRequest } from "../domain";

interface WorkerBase {
  moduleId: "gen6tinyambush";
  apiVersion: number;
}
export interface Gen6TinyAmbushWorkerInit extends WorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6TinyAmbushWorkerTask extends WorkerBase {
  type: "task";
  taskId: string;
  request: Gen6TinyAmbushRequest;
  stepSize: number;
}
export type Gen6TinyAmbushWorkerRequest =
  Gen6TinyAmbushWorkerInit | Gen6TinyAmbushWorkerTask;
export interface Gen6TinyAmbushWorkerReady extends WorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6TinyAmbushWorkerBatch extends WorkerBase {
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
export interface Gen6TinyAmbushWorkerError extends WorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6TinyAmbushWorkerResponse =
  | Gen6TinyAmbushWorkerReady
  | Gen6TinyAmbushWorkerBatch
  | Gen6TinyAmbushWorkerError;
