import type {
  Gen5HiddenGrottoChunk,
  Gen5HiddenGrottoOperation,
  Gen5HiddenGrottoRequest,
  Gen5HiddenGrottoResult,
} from "../domain";

interface Gen5HiddenGrottoWorkerBase {
  moduleId: "gen5hiddengrotto";
  apiVersion: number;
}

export interface Gen5HiddenGrottoWorkerInit extends Gen5HiddenGrottoWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5HiddenGrottoWorkerTask extends Gen5HiddenGrottoWorkerBase {
  type: "task";
  taskId: string;
  operation: Gen5HiddenGrottoOperation;
  chunkIndex: number;
  request: Gen5HiddenGrottoRequest;
  chunk: Gen5HiddenGrottoChunk;
}

export interface Gen5HiddenGrottoWorkerCache extends Gen5HiddenGrottoWorkerBase {
  type: "cache";
  cacheKey: string;
  mode: "iv" | "iv-sha";
  ivEntries: ArrayBuffer;
  ivEntryCount: number;
  shaEntries?: ArrayBuffer;
  shaEntryCount: number;
}

export interface Gen5HiddenGrottoWorkerClearCache extends Gen5HiddenGrottoWorkerBase {
  type: "cache-clear";
}

export type Gen5HiddenGrottoWorkerRequest =
  | Gen5HiddenGrottoWorkerInit
  | Gen5HiddenGrottoWorkerTask
  | Gen5HiddenGrottoWorkerCache
  | Gen5HiddenGrottoWorkerClearCache;

export interface Gen5HiddenGrottoWorkerReady extends Gen5HiddenGrottoWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly [
    "slot-generator",
    "slot-searcher",
    "pokemon-generator",
    "pokemon-searcher",
  ];
}

export interface Gen5HiddenGrottoWorkerCacheReady extends Gen5HiddenGrottoWorkerBase {
  type: "cache-ready";
  cacheKey: string;
}

export interface Gen5HiddenGrottoWorkerBatch extends Gen5HiddenGrottoWorkerBase {
  type: "batch";
  taskId: string;
  operation: Gen5HiddenGrottoOperation;
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5HiddenGrottoWorkerError extends Gen5HiddenGrottoWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5HiddenGrottoWorkerResponse =
  | Gen5HiddenGrottoWorkerReady
  | Gen5HiddenGrottoWorkerCacheReady
  | Gen5HiddenGrottoWorkerBatch
  | Gen5HiddenGrottoWorkerError;

export type { Gen5HiddenGrottoResult };
