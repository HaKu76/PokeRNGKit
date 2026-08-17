import type { Gen8WildChunk, Gen8WildRequest } from "../domain";

interface Gen8WildWorkerBase {
  moduleId: "gen8wild";
  apiVersion: number;
}

export interface Gen8WildWorkerInit extends Gen8WildWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen8WildWorkerTask extends Gen8WildWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8WildRequest;
  chunk: Gen8WildChunk;
}

export type Gen8WildWorkerRequest = Gen8WildWorkerInit | Gen8WildWorkerTask;

export interface Gen8WildWorkerReady extends Gen8WildWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen8WildWorkerBatch extends Gen8WildWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen8WildWorkerError extends Gen8WildWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen8WildWorkerResponse =
  Gen8WildWorkerReady | Gen8WildWorkerBatch | Gen8WildWorkerError;
