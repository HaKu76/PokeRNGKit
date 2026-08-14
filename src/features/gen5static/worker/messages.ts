import type {
  Gen5StaticChunk,
  Gen5StaticRequest,
  Gen5StaticResult,
} from "../domain";

interface Gen5StaticWorkerBase {
  moduleId: "gen5static";
  apiVersion: number;
}

export interface Gen5StaticWorkerInit extends Gen5StaticWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5StaticWorkerTask extends Gen5StaticWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  request: Gen5StaticRequest;
  chunk: Gen5StaticChunk;
}

export interface Gen5StaticWorkerCache extends Gen5StaticWorkerBase {
  type: "cache";
  cacheKey: string;
  mode: "iv" | "iv-sha";
  ivEntries: ArrayBuffer;
  ivEntryCount: number;
  shaEntries?: ArrayBuffer;
  shaEntryCount: number;
}

export interface Gen5StaticWorkerClearCache extends Gen5StaticWorkerBase {
  type: "cache-clear";
}

export type Gen5StaticWorkerRequest =
  | Gen5StaticWorkerInit
  | Gen5StaticWorkerCache
  | Gen5StaticWorkerClearCache
  | Gen5StaticWorkerTask;

export interface Gen5StaticWorkerReady extends Gen5StaticWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "searcher"];
}

export interface Gen5StaticWorkerCacheReady extends Gen5StaticWorkerBase {
  type: "cache-ready";
  cacheKey: string;
}

export interface Gen5StaticWorkerBatch extends Gen5StaticWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5StaticWorkerError extends Gen5StaticWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5StaticWorkerResponse =
  | Gen5StaticWorkerReady
  | Gen5StaticWorkerCacheReady
  | Gen5StaticWorkerBatch
  | Gen5StaticWorkerError;

export type { Gen5StaticResult };
