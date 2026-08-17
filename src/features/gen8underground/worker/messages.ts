import type { Gen8UndergroundChunk, Gen8UndergroundRequest } from "../domain";

interface Gen8UndergroundWorkerBase {
  moduleId: "gen8underground";
  apiVersion: number;
}

export interface Gen8UndergroundWorkerInit extends Gen8UndergroundWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen8UndergroundWorkerTask extends Gen8UndergroundWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8UndergroundRequest;
  chunk: Gen8UndergroundChunk;
}

export type Gen8UndergroundWorkerRequest =
  Gen8UndergroundWorkerInit | Gen8UndergroundWorkerTask;

export interface Gen8UndergroundWorkerReady extends Gen8UndergroundWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen8UndergroundWorkerBatch extends Gen8UndergroundWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen8UndergroundWorkerError extends Gen8UndergroundWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen8UndergroundWorkerResponse =
  | Gen8UndergroundWorkerReady
  | Gen8UndergroundWorkerBatch
  | Gen8UndergroundWorkerError;
