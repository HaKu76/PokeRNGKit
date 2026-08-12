import type { Gen3IvToPidRequest } from "../domain";

export interface Gen3IvToPidWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3IvToPidWorkerRunMessage {
  type: "run";
  taskId: string;
  request: Gen3IvToPidRequest;
}

export type Gen3IvToPidWorkerRequest =
  Gen3IvToPidWorkerInitMessage | Gen3IvToPidWorkerRunMessage;

export interface Gen3IvToPidWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Gen3IvToPidWorkerBatchMessage {
  type: "batch";
  taskId: string;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Gen3IvToPidWorkerErrorMessage {
  type: "error";
  taskId?: string;
  code: string;
  message: string;
}

export type Gen3IvToPidWorkerResponse =
  | Gen3IvToPidWorkerReadyMessage
  | Gen3IvToPidWorkerBatchMessage
  | Gen3IvToPidWorkerErrorMessage;
