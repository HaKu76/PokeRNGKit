import type { Gen6EggRequest } from "../domain";

interface Gen6EggWorkerBase {
  moduleId: "gen6egg";
  apiVersion: number;
}

export interface Gen6EggWorkerInit extends Gen6EggWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen6EggWorkerTask extends Gen6EggWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6EggRequest;
  stepSize: number;
}

export type Gen6EggWorkerRequest = Gen6EggWorkerInit | Gen6EggWorkerTask;

export interface Gen6EggWorkerReady extends Gen6EggWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen6EggWorkerBatch extends Gen6EggWorkerBase {
  type: "batch";
  taskId: string;
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen6EggWorkerError extends Gen6EggWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen6EggWorkerResponse =
  Gen6EggWorkerReady | Gen6EggWorkerBatch | Gen6EggWorkerError;
