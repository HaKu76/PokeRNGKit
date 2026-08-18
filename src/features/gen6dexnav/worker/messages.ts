import type { Gen6DexNavRequest } from "../domain";
interface Base {
  moduleId: "gen6dexnav";
  apiVersion: number;
}
export interface Gen6DexNavWorkerInit extends Base {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}
export interface Gen6DexNavWorkerTask extends Base {
  type: "task";
  taskId: string;
  request: Gen6DexNavRequest;
}
export type Gen6DexNavWorkerRequest =
  Gen6DexNavWorkerInit | Gen6DexNavWorkerTask;
export interface Gen6DexNavWorkerReady extends Base {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}
export interface Gen6DexNavWorkerBatch extends Base {
  type: "batch";
  taskId: string;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}
export interface Gen6DexNavWorkerError extends Base {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6DexNavWorkerResponse =
  Gen6DexNavWorkerReady | Gen6DexNavWorkerBatch | Gen6DexNavWorkerError;
