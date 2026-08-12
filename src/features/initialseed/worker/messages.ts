import type {
  Gen3InitialSeedChunk,
  Gen3RsInitialSeedRequest,
  Gen3TargetInitialSeedRequest,
} from "../domain";

export interface Gen3InitialSeedWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3InitialSeedWorkerRsIdsMessage {
  type: "rs-ids";
  taskId: string;
  request: Gen3RsInitialSeedRequest;
}

export interface Gen3InitialSeedWorkerTargetMessage {
  type: "target";
  taskId: string;
  request: Gen3TargetInitialSeedRequest;
  chunk: Gen3InitialSeedChunk;
}

export type Gen3InitialSeedWorkerRequest =
  | Gen3InitialSeedWorkerInitMessage
  | Gen3InitialSeedWorkerRsIdsMessage
  | Gen3InitialSeedWorkerTargetMessage;

export interface Gen3InitialSeedWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Gen3InitialSeedWorkerBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  stateCount: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Gen3InitialSeedWorkerErrorMessage {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  code: string;
  message: string;
}

export type Gen3InitialSeedWorkerResponse =
  | Gen3InitialSeedWorkerReadyMessage
  | Gen3InitialSeedWorkerBatchMessage
  | Gen3InitialSeedWorkerErrorMessage;
