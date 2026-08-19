import type { Gen7IdTimeRequest } from "../timeDomain";

interface Gen7IdTimeWorkerBase {
  moduleId: "gen7idtimefinder";
  apiVersion: number;
}

export interface Gen7IdTimeWorkerInit extends Gen7IdTimeWorkerBase {
  type: "init";
  contractVersion: number;
  initialSeedModuleUrl: string;
  idModuleUrl: string;
}

export interface Gen7IdTimeWorkerTask extends Gen7IdTimeWorkerBase {
  type: "task";
  taskId: string;
  operation: "id-time-search";
  request: Gen7IdTimeRequest;
}

export type Gen7IdTimeWorkerRequest =
  Gen7IdTimeWorkerInit | Gen7IdTimeWorkerTask;

export interface Gen7IdTimeWorkerReady extends Gen7IdTimeWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["id-time-search"];
}

export interface Gen7IdTimeWorkerBatch extends Gen7IdTimeWorkerBase {
  type: "batch";
  taskId: string;
  operation: "id-time-search";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7IdTimeWorkerError extends Gen7IdTimeWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7IdTimeWorkerResponse =
  Gen7IdTimeWorkerReady | Gen7IdTimeWorkerBatch | Gen7IdTimeWorkerError;
