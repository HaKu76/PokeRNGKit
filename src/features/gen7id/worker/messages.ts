import type { Gen7IdChunk, Gen7IdRequest } from "../domain";
export interface Gen7IdInitMessage {
  type: "init";
  moduleUrl: string;
}
export interface Gen7IdRunMessage {
  type: "run";
  taskId: string;
  chunk: Gen7IdChunk;
  request: Gen7IdRequest;
}
export type Gen7IdWorkerRequest = Gen7IdInitMessage | Gen7IdRunMessage;
export interface Gen7IdReadyMessage {
  type: "ready";
  apiVersion: number;
}
export interface Gen7IdBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  stateCount: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}
export interface Gen7IdErrorMessage {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}
export type Gen7IdWorkerResponse =
  Gen7IdReadyMessage | Gen7IdBatchMessage | Gen7IdErrorMessage;
