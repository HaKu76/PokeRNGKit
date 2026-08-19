import type { Gen6MtSeedRequest } from "../domain";

interface WorkerBase {
  moduleId: "gen6mtseed";
  apiVersion: number;
}
export interface Gen6MtSeedWorkerInit extends WorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6MtSeedWorkerTask extends WorkerBase {
  type: "task";
  taskId: string;
  request: Gen6MtSeedRequest;
  stepSize: number;
}
export type Gen6MtSeedWorkerRequest =
  Gen6MtSeedWorkerInit | Gen6MtSeedWorkerTask;
export interface Gen6MtSeedWorkerReady extends WorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["searcher"];
}
export interface Gen6MtSeedWorkerBatch extends WorkerBase {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}
export interface Gen6MtSeedWorkerError extends WorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6MtSeedWorkerResponse =
  Gen6MtSeedWorkerReady | Gen6MtSeedWorkerBatch | Gen6MtSeedWorkerError;
