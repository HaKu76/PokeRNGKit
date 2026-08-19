import type { Gen6EventTimeRequest } from "../timeDomain";
interface Base {
  moduleId: "gen6eventtimefinder";
  apiVersion: number;
}
export interface Gen6EventTimeWorkerInit extends Base {
  type: "init";
  moduleUrl: string;
  eventModuleUrl: string;
  timeModuleUrl: string;
  contractVersion: number;
}
export interface Gen6EventTimeWorkerTask extends Base {
  type: "task";
  taskId: string;
  operation: "event-time-search";
  request: Gen6EventTimeRequest;
  stepSize: number;
}
export type Gen6EventTimeWorkerRequest =
  Gen6EventTimeWorkerInit | Gen6EventTimeWorkerTask;
export interface Gen6EventTimeWorkerReady extends Base {
  type: "ready";
  contractVersion: number;
  operations: readonly ["event-time-search"];
}
export interface Gen6EventTimeWorkerBatch extends Base {
  type: "batch";
  taskId: string;
  operation: "event-time-search";
  batchIndex: number;
  buffer: ArrayBuffer;
  resultCount: number;
  totalProcessed: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}
export interface Gen6EventTimeWorkerError extends Base {
  type: "error";
  taskId?: string;
  message: string;
}
export type Gen6EventTimeWorkerResponse =
  | Gen6EventTimeWorkerReady
  | Gen6EventTimeWorkerBatch
  | Gen6EventTimeWorkerError;
