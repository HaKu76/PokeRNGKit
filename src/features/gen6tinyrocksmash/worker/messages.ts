import type { Gen6TinyRockSmashRequest } from "../domain";

interface WorkerBase {
  moduleId: "gen6tinyrocksmash";
  apiVersion: number;
}
export interface Gen6TinyRockSmashWorkerInit extends WorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6TinyRockSmashWorkerTask extends WorkerBase {
  type: "task";
  taskId: string;
  request: Gen6TinyRockSmashRequest;
  stepSize: number;
}
export type Gen6TinyRockSmashWorkerRequest =
  Gen6TinyRockSmashWorkerInit | Gen6TinyRockSmashWorkerTask;
export interface Gen6TinyRockSmashWorkerReady extends WorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6TinyRockSmashWorkerBatch extends WorkerBase {
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
export interface Gen6TinyRockSmashWorkerError extends WorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6TinyRockSmashWorkerResponse =
  | Gen6TinyRockSmashWorkerReady
  | Gen6TinyRockSmashWorkerBatch
  | Gen6TinyRockSmashWorkerError;
