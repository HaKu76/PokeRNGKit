import type { Gen3NgcSeedRequest } from "../domain";
export interface Gen3NgcSeedWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}
export interface Gen3NgcSeedWorkerRunMessage {
  type: "run";
  taskId: string;
  chunkIndex: number;
  rangeStart: number;
  stateCount: number;
  request: Gen3NgcSeedRequest;
}
export type Gen3NgcSeedWorkerRequest =
  Gen3NgcSeedWorkerInitMessage | Gen3NgcSeedWorkerRunMessage;
export interface Gen3NgcSeedWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}
export interface Gen3NgcSeedWorkerBatchMessage {
  type: "batch";
  taskId: string;
  chunkIndex: number;
  resultCount: number;
  processed: number;
  total: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}
export interface Gen3NgcSeedWorkerErrorMessage {
  type: "error";
  taskId?: string;
  code: string;
  message: string;
}
export type Gen3NgcSeedWorkerResponse =
  | Gen3NgcSeedWorkerReadyMessage
  | Gen3NgcSeedWorkerBatchMessage
  | Gen3NgcSeedWorkerErrorMessage;
