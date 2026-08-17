import type { Gen8RaidChunk, Gen8RaidRequest } from "../domain";

interface Gen8RaidWorkerBase {
  moduleId: "gen8raids";
  apiVersion: number;
}
export interface Gen8RaidWorkerInit extends Gen8RaidWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen8RaidWorkerTask extends Gen8RaidWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  request: Gen8RaidRequest;
  chunk: Gen8RaidChunk;
}
export type Gen8RaidWorkerRequest = Gen8RaidWorkerInit | Gen8RaidWorkerTask;
export interface Gen8RaidWorkerReady extends Gen8RaidWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen8RaidWorkerBatch extends Gen8RaidWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}
export interface Gen8RaidWorkerError extends Gen8RaidWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}
export type Gen8RaidWorkerResponse =
  Gen8RaidWorkerReady | Gen8RaidWorkerBatch | Gen8RaidWorkerError;
