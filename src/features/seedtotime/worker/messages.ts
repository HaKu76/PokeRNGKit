import type { Gen3SeedToTimeRequest } from "../domain";

export interface Gen3SeedToTimeWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3SeedToTimeWorkerRunMessage {
  type: "run";
  taskId: string;
  request: Gen3SeedToTimeRequest;
}

export type Gen3SeedToTimeWorkerRequest =
  | Gen3SeedToTimeWorkerInitMessage
  | Gen3SeedToTimeWorkerRunMessage;

export interface Gen3SeedToTimeWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}

export interface Gen3SeedToTimeWorkerBatchMessage {
  type: "batch";
  taskId: string;
  originSeed: number;
  advances: number;
  resultCount: number;
  elapsedMs: number;
  buffer: ArrayBuffer;
}

export interface Gen3SeedToTimeWorkerErrorMessage {
  type: "error";
  taskId?: string;
  code: string;
  message: string;
}

export type Gen3SeedToTimeWorkerResponse =
  | Gen3SeedToTimeWorkerReadyMessage
  | Gen3SeedToTimeWorkerBatchMessage
  | Gen3SeedToTimeWorkerErrorMessage;
