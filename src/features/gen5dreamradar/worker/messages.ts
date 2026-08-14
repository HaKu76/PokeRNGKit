import type {
  Gen5DreamRadarChunk,
  Gen5DreamRadarRequest,
  Gen5DreamRadarResult,
} from "../domain";

interface Gen5DreamRadarWorkerBase {
  moduleId: "gen5dreamradar";
  apiVersion: number;
}

export interface Gen5DreamRadarWorkerInit extends Gen5DreamRadarWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen5DreamRadarWorkerTask extends Gen5DreamRadarWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  request: Gen5DreamRadarRequest;
  chunk: Gen5DreamRadarChunk;
}

export type Gen5DreamRadarWorkerRequest =
  Gen5DreamRadarWorkerInit | Gen5DreamRadarWorkerTask;

export interface Gen5DreamRadarWorkerReady extends Gen5DreamRadarWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator", "searcher"];
}

export interface Gen5DreamRadarWorkerBatch extends Gen5DreamRadarWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator" | "searcher";
  chunkIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  resultCount: number;
  limitReached: boolean;
}

export interface Gen5DreamRadarWorkerError extends Gen5DreamRadarWorkerBase {
  type: "error";
  taskId?: string;
  chunkIndex?: number;
  message: string;
}

export type Gen5DreamRadarWorkerResponse =
  | Gen5DreamRadarWorkerReady
  | Gen5DreamRadarWorkerBatch
  | Gen5DreamRadarWorkerError;

export type { Gen5DreamRadarResult };
