import type { Gen7StationaryTimeRequest } from "../domain";

interface Gen7StationaryTimeWorkerBase {
  moduleId: "gen7timefinder";
  apiVersion: number;
}

export interface Gen7StationaryTimeWorkerInit extends Gen7StationaryTimeWorkerBase {
  type: "init";
  moduleUrl: string;
  stationaryModuleUrl: string;
  contractVersion: number;
}

export interface Gen7StationaryTimeWorkerTask extends Gen7StationaryTimeWorkerBase {
  type: "task";
  taskId: string;
  operation: "time-search";
  request: Gen7StationaryTimeRequest;
  stepSize: number;
}

export type Gen7StationaryTimeWorkerRequest =
  Gen7StationaryTimeWorkerInit | Gen7StationaryTimeWorkerTask;

export interface Gen7StationaryTimeWorkerReady extends Gen7StationaryTimeWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["time-search"];
}

export interface Gen7StationaryTimeWorkerBatch extends Gen7StationaryTimeWorkerBase {
  type: "batch";
  taskId: string;
  operation: "time-search";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7StationaryTimeWorkerError extends Gen7StationaryTimeWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7StationaryTimeWorkerResponse =
  | Gen7StationaryTimeWorkerReady
  | Gen7StationaryTimeWorkerBatch
  | Gen7StationaryTimeWorkerError;
