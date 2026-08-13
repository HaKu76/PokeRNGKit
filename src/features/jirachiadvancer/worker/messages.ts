import type { Gen3JirachiRequest } from "../domain";

export type Gen3JirachiWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | { type: "run"; taskId: string; request: Gen3JirachiRequest };

export type Gen3JirachiWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "batch";
      taskId: string;
      resultCount: number;
      targetAdvances: number;
      errorCode: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | { type: "error"; taskId?: string; code: string; message: string };
