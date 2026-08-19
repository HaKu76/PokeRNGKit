import type { Gen6TinyTimelineRequest } from "../domain";

interface Base {
  moduleId: "gen6tinytimeline";
  apiVersion: number;
}

export type Gen6TinyTimelineWorkerRequest =
  | (Base & { type: "init"; moduleUrl: string; contractVersion: number })
  | (Base & { type: "task"; taskId: string; request: Gen6TinyTimelineRequest });

export type Gen6TinyTimelineWorkerResponse =
  | (Base & {
      type: "ready";
      contractVersion: number;
      operations: readonly ["generator"];
    })
  | (Base & {
      type: "batch";
      taskId: string;
      buffer: ArrayBuffer;
      processedCount: number;
      resultCount: number;
      limitReached: boolean;
    })
  | (Base & { type: "error"; taskId?: string; message: string });
