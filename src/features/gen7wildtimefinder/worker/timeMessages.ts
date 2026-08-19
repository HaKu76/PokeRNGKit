import type { Gen7WildTimeRequest } from "../timeDomain";
export type Gen7WildTimeWorkerRequest =
  | { type: "init"; moduleUrl: string; initialSeedUrl: string }
  | { type: "task"; request: Gen7WildTimeRequest; taskId: string };
export type Gen7WildTimeWorkerResponse =
  | { type: "ready" }
  | {
      type: "batch";
      taskId: string;
      buffer: ArrayBuffer;
      processed: number;
      total: number;
      results: number;
      done: boolean;
      limited: boolean;
    }
  | { type: "error"; taskId?: string; message: string };
