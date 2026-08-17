import type { Gen8StaticChunk, Gen8StaticRequest } from "../domain";

interface Gen8StaticWorkerBase {
  moduleId: "gen8static";
  apiVersion: number;
}

export interface Gen8StaticWorkerInit extends Gen8StaticWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen8StaticWorkerTask extends Gen8StaticWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8StaticRequest;
  chunk: Gen8StaticChunk;
}

export type Gen8StaticWorkerRequest =
  Gen8StaticWorkerInit | Gen8StaticWorkerTask;

export interface Gen8StaticWorkerReady extends Gen8StaticWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen8StaticWorkerBatch extends Gen8StaticWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen8StaticWorkerError extends Gen8StaticWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen8StaticWorkerResponse =
  Gen8StaticWorkerReady | Gen8StaticWorkerBatch | Gen8StaticWorkerError;
