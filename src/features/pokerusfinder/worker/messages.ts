import type { PokerusGen3Request, PokerusPtHgssRequest } from "../domain";

export interface PokerusFinderWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}
export interface PokerusFinderWorkerRunMessage {
  type: "run-gen3" | "run-pthgss";
  taskId: string;
  request: PokerusGen3Request | PokerusPtHgssRequest;
}
export type PokerusFinderWorkerRequest =
  PokerusFinderWorkerInitMessage | PokerusFinderWorkerRunMessage;
export interface PokerusFinderWorkerReadyMessage {
  type: "ready";
  apiVersion: number;
}
export interface PokerusFinderWorkerBatchMessage {
  type: "batch";
  taskId: string;
  resultCount: number;
  processed: number;
  total: number;
  elapsedMs: number;
  hasDelay: boolean;
  buffer: ArrayBuffer;
}
export interface PokerusFinderWorkerErrorMessage {
  type: "error";
  taskId?: string;
  code: string;
  message: string;
}
export type PokerusFinderWorkerResponse =
  | PokerusFinderWorkerReadyMessage
  | PokerusFinderWorkerBatchMessage
  | PokerusFinderWorkerErrorMessage;
