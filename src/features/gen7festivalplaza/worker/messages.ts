import type { Gen7FestivalPlazaRequest } from "../domain";

interface Gen7FestivalPlazaWorkerBase {
  moduleId: "gen7festivalplaza";
  apiVersion: number;
}

export interface Gen7FestivalPlazaWorkerInit extends Gen7FestivalPlazaWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7FestivalPlazaWorkerTask extends Gen7FestivalPlazaWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  request: Gen7FestivalPlazaRequest;
  stepSize: number;
}

export type Gen7FestivalPlazaWorkerRequest =
  Gen7FestivalPlazaWorkerInit | Gen7FestivalPlazaWorkerTask;

export interface Gen7FestivalPlazaWorkerReady extends Gen7FestivalPlazaWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7FestivalPlazaWorkerBatch extends Gen7FestivalPlazaWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7FestivalPlazaWorkerError extends Gen7FestivalPlazaWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7FestivalPlazaWorkerResponse =
  | Gen7FestivalPlazaWorkerReady
  | Gen7FestivalPlazaWorkerBatch
  | Gen7FestivalPlazaWorkerError;
