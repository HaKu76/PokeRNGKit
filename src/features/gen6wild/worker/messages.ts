import type { Gen6WildRequest } from "../domain";

interface Gen6WildWorkerBase {
  moduleId: "gen6wild";
  apiVersion: number;
}
export interface Gen6WildWorkerInit extends Gen6WildWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6WildWorkerTask extends Gen6WildWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6WildRequest;
}
export type Gen6WildWorkerRequest = Gen6WildWorkerInit | Gen6WildWorkerTask;
export interface Gen6WildWorkerReady extends Gen6WildWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6WildWorkerBatch extends Gen6WildWorkerBase {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}
export interface Gen6WildWorkerError extends Gen6WildWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6WildWorkerResponse =
  Gen6WildWorkerReady | Gen6WildWorkerBatch | Gen6WildWorkerError;
