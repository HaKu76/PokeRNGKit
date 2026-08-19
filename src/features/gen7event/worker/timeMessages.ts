import type { Gen7EventTimeRequest } from "../timeDomain";

interface Gen7EventTimeWorkerBase {
  moduleId: "gen7eventtimefinder";
  apiVersion: number;
}

export interface Gen7EventTimeWorkerInit extends Gen7EventTimeWorkerBase {
  type: "init";
  moduleUrl: string;
  eventModuleUrl: string;
  contractVersion: number;
}

export interface Gen7EventTimeWorkerTask extends Gen7EventTimeWorkerBase {
  type: "task";
  taskId: string;
  operation: "event-time-search";
  request: Gen7EventTimeRequest;
  stepSize: number;
}

export type Gen7EventTimeWorkerRequest =
  Gen7EventTimeWorkerInit | Gen7EventTimeWorkerTask;

export interface Gen7EventTimeWorkerReady extends Gen7EventTimeWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["event-time-search"];
}

export interface Gen7EventTimeWorkerBatch extends Gen7EventTimeWorkerBase {
  type: "batch";
  taskId: string;
  operation: "event-time-search";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7EventTimeWorkerError extends Gen7EventTimeWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7EventTimeWorkerResponse =
  | Gen7EventTimeWorkerReady
  | Gen7EventTimeWorkerBatch
  | Gen7EventTimeWorkerError;
