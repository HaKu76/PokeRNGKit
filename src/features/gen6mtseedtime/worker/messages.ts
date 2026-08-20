import type { Gen6MtSeedTimeRequest } from "../domain";
interface Base {
  moduleId: "gen6mtseedtime";
  apiVersion: number;
}
export type Gen6MtSeedTimeWorkerRequest =
  | (Base & { type: "init"; moduleUrl: string; contractVersion: number })
  | (Base & {
      type: "task";
      taskId: string;
      request: Gen6MtSeedTimeRequest;
      stepSize: number;
    });
export type Gen6MtSeedTimeWorkerResponse =
  | (Base & {
      type: "ready";
      contractVersion: number;
      operations: readonly ["searcher"];
    })
  | (Base & {
      type: "batch";
      taskId: string;
      buffer: ArrayBuffer;
      resultCount: number;
      totalProcessed: number;
      totalResultCount: number;
      done: boolean;
      limitReached: boolean;
    })
  | (Base & { type: "error"; taskId?: string; message: string });
