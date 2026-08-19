import type { Gen6StationaryTimeRequest } from "../timeDomain";
interface Base {
  moduleId: "gen6timefinder";
  apiVersion: number;
}
export interface Gen6StationaryTimeWorkerInit extends Base {
  type: "init";
  moduleUrl: string;
  stationaryModuleUrl: string;
  contractVersion: number;
}
export interface Gen6StationaryTimeWorkerTask extends Base {
  type: "task";
  taskId: string;
  operation: "stationary-time-search";
  request: Gen6StationaryTimeRequest;
  stepSize: number;
}
export type Gen6StationaryTimeWorkerRequest =
  Gen6StationaryTimeWorkerInit | Gen6StationaryTimeWorkerTask;
export interface Gen6StationaryTimeWorkerReady extends Base {
  type: "ready";
  contractVersion: number;
  operations: readonly ["stationary-time-search"];
}
export interface Gen6StationaryTimeWorkerBatch extends Base {
  type: "batch";
  taskId: string;
  operation: "stationary-time-search";
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}
export interface Gen6StationaryTimeWorkerError extends Base {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6StationaryTimeWorkerResponse =
  | Gen6StationaryTimeWorkerReady
  | Gen6StationaryTimeWorkerBatch
  | Gen6StationaryTimeWorkerError;
