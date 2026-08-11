import type {
  Gen3WildChunk,
  Gen3WildRequest,
  Gen3WildSearcherChunk,
  Gen3WildSearcherRequest,
} from "../domain";

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

export interface Gen3WildWorkerSearchMessage {
  type: "search";
  taskId: string;
  chunk: Gen3WildSearcherChunk;
  request: Gen3WildSearcherRequest;
}

export type Gen3WildWorkerRequest =
  | Gen3WildWorkerInitMessage
  | Gen3WildWorkerRunMessage
  | Gen3WildWorkerSearchMessage;

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
