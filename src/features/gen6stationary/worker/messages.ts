import type { Gen6StationaryRequest } from "../domain";

interface Gen6StationaryWorkerBase {
  moduleId: "gen6stationary";
  apiVersion: number;
}
export interface Gen6StationaryWorkerInit extends Gen6StationaryWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6StationaryWorkerTask extends Gen6StationaryWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6StationaryRequest;
}
export type Gen6StationaryWorkerRequest =
  Gen6StationaryWorkerInit | Gen6StationaryWorkerTask;
export interface Gen6StationaryWorkerReady extends Gen6StationaryWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6StationaryWorkerBatch extends Gen6StationaryWorkerBase {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}
export interface Gen6StationaryWorkerError extends Gen6StationaryWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6StationaryWorkerResponse =
  | Gen6StationaryWorkerReady
  | Gen6StationaryWorkerBatch
  | Gen6StationaryWorkerError;
