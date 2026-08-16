import type {
  Gen7MainQrRequest,
  Gen7MainSeedRequest,
  Gen7MainTimeRequest,
  Gen7MainSeedChunk,
} from "../domain";

interface Gen7MainWorkerBase {
  moduleId: "gen7main";
  apiVersion: number;
}

export interface Gen7MainWorkerInit extends Gen7MainWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7MainWorkerSeedTask extends Gen7MainWorkerBase {
  type: "task";
  taskId: string;
  operation: "seed-search";
  request: Gen7MainSeedRequest;
  chunkIndex: number;
  chunk: Gen7MainSeedChunk;
}

export interface Gen7MainWorkerQrTask extends Gen7MainWorkerBase {
  type: "task";
  taskId: string;
  operation: "qr-search";
  request: Gen7MainQrRequest;
}

export interface Gen7MainWorkerTimeTask extends Gen7MainWorkerBase {
  type: "task";
  taskId: string;
  operation: "time-calculator";
  request: Gen7MainTimeRequest;
}

export type Gen7MainWorkerTask =
  Gen7MainWorkerSeedTask | Gen7MainWorkerQrTask | Gen7MainWorkerTimeTask;
export type Gen7MainWorkerRequest = Gen7MainWorkerInit | Gen7MainWorkerTask;

export interface Gen7MainWorkerReady extends Gen7MainWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["seed-search", "qr-search", "time-calculator"];
}

export interface Gen7MainWorkerSeedBatch extends Gen7MainWorkerBase {
  type: "seed-batch";
  taskId: string;
  operation: "seed-search";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedSeeds: number;
}

export interface Gen7MainWorkerQrResult extends Gen7MainWorkerBase {
  type: "qr-result";
  taskId: string;
  operation: "qr-search";
  buffer: ArrayBuffer;
  resultCount: number;
}

export interface Gen7MainWorkerTimeResult extends Gen7MainWorkerBase {
  type: "time-result";
  taskId: string;
  operation: "time-calculator";
  primaryFrames: number;
  secondaryFrames: number;
}

export interface Gen7MainWorkerError extends Gen7MainWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen7MainWorkerResponse =
  | Gen7MainWorkerReady
  | Gen7MainWorkerSeedBatch
  | Gen7MainWorkerQrResult
  | Gen7MainWorkerTimeResult
  | Gen7MainWorkerError;
