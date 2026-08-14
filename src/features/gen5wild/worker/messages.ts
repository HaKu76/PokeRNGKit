import type { Gen5WildChunk, Gen5WildRequest, Gen5WildResult } from "../domain";

interface Gen5WildWorkerBase {
  moduleId: "gen5wild";
  apiVersion: number;
}

export interface Gen5WildWorkerInit extends Gen5WildWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5WildWorkerTask extends Gen5WildWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  request: Gen5WildRequest;
  chunk: Gen5WildChunk;
}

export interface Gen5WildWorkerCache extends Gen5WildWorkerBase {
  type: "cache";
  cacheKey: string;
  mode: "iv" | "iv-sha";
  ivEntries: ArrayBuffer;
  ivEntryCount: number;
  shaEntries?: ArrayBuffer;
  shaEntryCount: number;
}

export interface Gen5WildWorkerClearCache extends Gen5WildWorkerBase {
  type: "cache-clear";
}

export type Gen5WildWorkerRequest =
  | Gen5WildWorkerInit
  | Gen5WildWorkerCache
  | Gen5WildWorkerClearCache
  | Gen5WildWorkerTask;

export interface Gen5WildWorkerReady extends Gen5WildWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "searcher"];
}

export interface Gen5WildWorkerCacheReady extends Gen5WildWorkerBase {
  type: "cache-ready";
  cacheKey: string;
}

export interface Gen5WildWorkerBatch extends Gen5WildWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5WildWorkerError extends Gen5WildWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5WildWorkerResponse =
  | Gen5WildWorkerReady
  | Gen5WildWorkerCacheReady
  | Gen5WildWorkerBatch
  | Gen5WildWorkerError;

export type { Gen5WildResult };
