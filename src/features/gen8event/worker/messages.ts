import type { Gen8EventChunk, Gen8EventRequest } from "../domain";

interface Gen8EventWorkerBase {
  moduleId: "gen8event";
  apiVersion: number;
}

export interface Gen8EventWorkerInit extends Gen8EventWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen8EventWorkerTask extends Gen8EventWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8EventRequest;
  chunk: Gen8EventChunk;
}

export type Gen8EventWorkerRequest = Gen8EventWorkerInit | Gen8EventWorkerTask;

export interface Gen8EventWorkerReady extends Gen8EventWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen8EventWorkerBatch extends Gen8EventWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen8EventWorkerError extends Gen8EventWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen8EventWorkerResponse =
  Gen8EventWorkerReady | Gen8EventWorkerBatch | Gen8EventWorkerError;
