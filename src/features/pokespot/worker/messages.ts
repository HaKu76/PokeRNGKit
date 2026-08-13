import type { Gen3PokeSpotChunk, Gen3PokeSpotRequest } from "../domain";

export type Gen3PokeSpotWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | {
      type: "run";
      taskId: string;
      request: Gen3PokeSpotRequest;
      chunk: Gen3PokeSpotChunk;
    };

export type Gen3PokeSpotWorkerResponse =
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
