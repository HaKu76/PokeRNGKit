import type { GameCubeChunk, GameCubeRequest } from "../domain";
export type GameCubeWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | {
      type: "run";
      taskId: string;
      request: GameCubeRequest;
      chunk: GameCubeChunk;
    };
export type GameCubeWorkerResponse =
  | { type: "ready"; apiVersion: number }
  | {
      type: "batch";
      taskId: string;
      chunkIndex: number;
      stateCount: number;
      resultCount: number;
      resultLimitReached: boolean;
      buffer: ArrayBuffer;
    }
  | { type: "error"; taskId?: string; code: string; message: string };
