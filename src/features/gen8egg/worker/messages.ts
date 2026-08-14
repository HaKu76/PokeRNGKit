import type { Gen8EggChunk, Gen8EggRequest } from "../domain";

interface Gen8EggWorkerBase {
  moduleId: "gen8egg";
  apiVersion: number;
}

export interface Gen8EggWorkerInit extends Gen8EggWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen8EggWorkerTask extends Gen8EggWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8EggRequest;
  chunk: Gen8EggChunk;
}

export type Gen8EggWorkerRequest = Gen8EggWorkerInit | Gen8EggWorkerTask;

export interface Gen8EggWorkerReady extends Gen8EggWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen8EggWorkerBatch extends Gen8EggWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen8EggWorkerError extends Gen8EggWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen8EggWorkerResponse =
  Gen8EggWorkerReady | Gen8EggWorkerBatch | Gen8EggWorkerError;
