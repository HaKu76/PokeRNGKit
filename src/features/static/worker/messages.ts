import type {
  Gen3StaticChunk,
  Gen3StaticEmeraldChunk,
  Gen3StaticEmeraldRequest,
  Gen3StaticRequest,
  Gen3StaticSearcherChunk,
  Gen3StaticSearcherRequest,
} from "../domain";

export interface Gen3StaticWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3StaticWorkerRunMessage {
  type: "run";
  taskId: string;
  chunk: Gen3StaticChunk;
  request: Gen3StaticRequest;
}

export interface Gen3StaticWorkerSearchMessage {
  type: "search";
  taskId: string;
  chunk: Gen3StaticSearcherChunk;
  request: Gen3StaticSearcherRequest;
}

export interface Gen3StaticWorkerEmeraldSearchMessage {
  type: "emerald-search";
  taskId: string;
  chunk: Gen3StaticEmeraldChunk;
  request: Gen3StaticEmeraldRequest;
}

export type Gen3StaticWorkerRequest =
  | Gen3StaticWorkerInitMessage
  | Gen3StaticWorkerRunMessage
  | Gen3StaticWorkerSearchMessage
  | Gen3StaticWorkerEmeraldSearchMessage;

export interface Gen3StaticWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Gen3StaticWorkerBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  stateCount: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Gen3StaticWorkerErrorMessage {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

export type Gen3StaticWorkerResponse =
  | Gen3StaticWorkerReadyMessage
  | Gen3StaticWorkerBatchMessage
  | Gen3StaticWorkerErrorMessage;
