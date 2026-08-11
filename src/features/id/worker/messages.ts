import type {
  Id3Chunk,
  Id3Filters,
  Id3Mode,
  Id3SearcherRequest,
} from "../domain";

export interface Id3WorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Id3WorkerRunMessage {
  type: "run";
  taskId: string;
  chunk: Id3Chunk;
  mode: Id3Mode;
  input: number;
  filters: Id3Filters;
}

export interface Id3WorkerSearchMessage {
  type: "search";
  taskId: string;
  request: Id3SearcherRequest;
}

export type Id3WorkerRequest =
  Id3WorkerInitMessage | Id3WorkerRunMessage | Id3WorkerSearchMessage;

export interface Id3WorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Id3WorkerBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  stateCount: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Id3WorkerSearchBatchMessage {
  type: "search-batch";
  taskId: string;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Id3WorkerErrorMessage {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

export type Id3WorkerResponse =
  | Id3WorkerReadyMessage
  | Id3WorkerBatchMessage
  | Id3WorkerSearchBatchMessage
  | Id3WorkerErrorMessage;
