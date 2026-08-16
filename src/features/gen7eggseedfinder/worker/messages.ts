import type { Gen7EggSeedChunk, Gen7EggSeedSearchRequest } from "../domain";

export type Gen7EggSeedWorkerRequest =
  | { type: "init"; moduleUrl: string }
  | {
      type: "search";
      taskId: string;
      request: Gen7EggSeedSearchRequest;
      chunk: Gen7EggSeedChunk;
    }
  | { type: "magikarp"; taskId: string; bits: ArrayBuffer };

export type Gen7EggSeedWorkerResponse =
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
      type: "magikarp";
      taskId: string;
      buffer: ArrayBuffer;
    }
  | { type: "error"; taskId?: string; chunkIndex?: number; message: string };
