import type { Gen7BattleTreeRequest } from "../domain";

interface Gen7BattleTreeWorkerBase {
  moduleId: "gen7battletree";
  apiVersion: number;
}

export interface Gen7BattleTreeWorkerInit extends Gen7BattleTreeWorkerBase {
  type: "init";
  moduleUrl: string;
  contractVersion: number;
}

export interface Gen7BattleTreeWorkerTask extends Gen7BattleTreeWorkerBase {
  type: "task";
  taskId: string;
  operation: "generator";
  request: Gen7BattleTreeRequest;
  stepSize: number;
}

export type Gen7BattleTreeWorkerRequest =
  Gen7BattleTreeWorkerInit | Gen7BattleTreeWorkerTask;

export interface Gen7BattleTreeWorkerReady extends Gen7BattleTreeWorkerBase {
  type: "ready";
  contractVersion: number;
  operations: readonly ["generator"];
}

export interface Gen7BattleTreeWorkerBatch extends Gen7BattleTreeWorkerBase {
  type: "batch";
  taskId: string;
  operation: "generator";
  batchIndex: number;
  buffer: ArrayBuffer;
  processedCount: number;
  totalProcessed: number;
  resultCount: number;
  totalResultCount: number;
  done: boolean;
  limitReached: boolean;
}

export interface Gen7BattleTreeWorkerError extends Gen7BattleTreeWorkerBase {
  type: "error";
  taskId?: string;
  message: string;
}

export type Gen7BattleTreeWorkerResponse =
  | Gen7BattleTreeWorkerReady
  | Gen7BattleTreeWorkerBatch
  | Gen7BattleTreeWorkerError;
