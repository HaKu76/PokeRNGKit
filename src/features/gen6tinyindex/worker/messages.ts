import type { Gen6TinyIndexRequest } from "../domain";

interface Gen6TinyIndexWorkerBase {
  moduleId: "gen6tinyindex";
  apiVersion: number;
}

export interface Gen6TinyIndexWorkerInit extends Gen6TinyIndexWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen6TinyIndexWorkerTask extends Gen6TinyIndexWorkerBase {
  type: "task";
  taskId: string;
  request: Gen6TinyIndexRequest;
  stepSize: number;
}

export type Gen6TinyIndexWorkerRequest =
  Gen6TinyIndexWorkerInit | Gen6TinyIndexWorkerTask;

export interface Gen6TinyIndexWorkerReady extends Gen6TinyIndexWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "dateSearcher"];
}

export interface Gen6TinyIndexWorkerBatch extends Gen6TinyIndexWorkerBase {
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

export interface Gen6TinyIndexWorkerError extends Gen6TinyIndexWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen6TinyIndexWorkerResponse =
  | Gen6TinyIndexWorkerReady
  | Gen6TinyIndexWorkerBatch
  | Gen6TinyIndexWorkerError;
