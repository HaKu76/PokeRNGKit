import type { Gen6PokeRadarRequest } from "../domain";
interface Base {
  moduleId: "gen6pokeradar";
  apiVersion: number;
}
export type Gen6PokeRadarWorkerRequest =
  | (Base & { type: "init"; moduleUrl: string; contractVersion: number })
  | (Base & { type: "task"; taskId: string; request: Gen6PokeRadarRequest });
export type Gen6PokeRadarWorkerResponse =
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
