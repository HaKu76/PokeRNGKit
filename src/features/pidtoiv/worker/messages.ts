import type { Gen3PidToIvRequest } from "../domain";

export type Gen3PidToIvWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | { type: "run"; taskId: string; request: Gen3PidToIvRequest };

export type Gen3PidToIvWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "batch";
      taskId: string;
      resultCount: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | { type: "error"; taskId?: string; code: string; message: string };
