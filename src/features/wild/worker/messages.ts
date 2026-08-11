import type { Gen3WildChunk, Gen3WildRequest } from "../domain";

export interface Gen3WildWorkerInitMessage {
  type: "init";
  moduleUrl: string;
}

export interface Gen3WildWorkerRunMessage {
  type: "run";
  taskId: string;
  chunk: Gen3WildChunk;
  request: Gen3WildRequest;
}

export type Gen3WildWorkerRequest =
  Gen3WildWorkerInitMessage | Gen3WildWorkerRunMessage;

export type Gen3WildWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "batch";
      taskId: string;
      chunkIndex: number;
      stateCount: number;
      resultCount: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "error";
      taskId?: string;
      chunkIndex?: number;
      code: string;
      message: string;
    };

export type Gen3WildWorkerBatchMessage = Extract<
  Gen3WildWorkerResponse,
  { type: "batch" }
>;
