import type { Gen3EggChunk, Gen3EggRequest } from "../domain";

export interface Gen3EggWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3EggWorkerRunMessage {
  type: "run";
  taskId: string;
  chunk: Gen3EggChunk;
  request: Gen3EggRequest;
}

export type Gen3EggWorkerRequest =
  | Gen3EggWorkerInitMessage
  | Gen3EggWorkerRunMessage;

export interface Gen3EggWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Gen3EggWorkerBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  stateCount: number;
  resultCount: number;
  elapsedMs: number;
  truncated: boolean;
  buffer: ArrayBuffer;
}

export interface Gen3EggWorkerErrorMessage {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

export type Gen3EggWorkerResponse =
  | Gen3EggWorkerReadyMessage
  | Gen3EggWorkerBatchMessage
  | Gen3EggWorkerErrorMessage;
