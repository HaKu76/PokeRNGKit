import type { Gen5EggChunk, Gen5EggRequest, Gen5EggResult } from "../domain";

interface Gen5EggWorkerBase {
  moduleId: "gen5egg";
  apiVersion: number;
}

export interface Gen5EggWorkerInit extends Gen5EggWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5EggWorkerTask extends Gen5EggWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  request: Gen5EggRequest;
  chunk: Gen5EggChunk;
}

export type Gen5EggWorkerRequest = Gen5EggWorkerInit | Gen5EggWorkerTask;

export interface Gen5EggWorkerReady extends Gen5EggWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "searcher"];
}

export interface Gen5EggWorkerBatch extends Gen5EggWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5EggWorkerError extends Gen5EggWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5EggWorkerResponse =
  Gen5EggWorkerReady | Gen5EggWorkerBatch | Gen5EggWorkerError;

export type { Gen5EggResult };
