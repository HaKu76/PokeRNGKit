import type {
  Gen5EventChunk,
  Gen5EventRequest,
  Gen5EventResult,
} from "../domain";

interface Gen5EventWorkerBase {
  moduleId: "gen5event";
  apiVersion: number;
}

export interface Gen5EventWorkerInit extends Gen5EventWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5EventWorkerTask extends Gen5EventWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  request: Gen5EventRequest;
  chunk: Gen5EventChunk;
}

export type Gen5EventWorkerRequest = Gen5EventWorkerInit | Gen5EventWorkerTask;

export interface Gen5EventWorkerReady extends Gen5EventWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "searcher"];
}

export interface Gen5EventWorkerBatch extends Gen5EventWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5EventWorkerError extends Gen5EventWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5EventWorkerResponse =
  Gen5EventWorkerReady | Gen5EventWorkerBatch | Gen5EventWorkerError;

export type { Gen5EventResult };
