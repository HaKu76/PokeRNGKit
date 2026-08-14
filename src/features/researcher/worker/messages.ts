import type { ResearcherRequest } from "../domain";

export const RESEARCHER_MODULE_ID = "researcher" as const;
export const RESEARCHER_CONTRACT_VERSION = 1 as const;

export interface ResearcherChunk {
  index: number;
  stateCount: number;
}

export type ResearcherWorkerRequest =
  | {
      type: "init";
      moduleId: typeof RESEARCHER_MODULE_ID;
      moduleUrl: string;
      contractVersion: typeof RESEARCHER_CONTRACT_VERSION;
      apiVersion: number;
    }
  | {
      type: "task";
      moduleId: typeof RESEARCHER_MODULE_ID;
      apiVersion: number;
      taskId: string;
      operation: "generator";
      chunkIndex: number;
      request: ResearcherRequest;
      chunk: ResearcherChunk;
    };

export type ResearcherWorkerResponse =
  | {
      type: "ready";
      moduleId: typeof RESEARCHER_MODULE_ID;
      contractVersion: typeof RESEARCHER_CONTRACT_VERSION;
      apiVersion: number;
      operations: readonly ["generator"];
    }
  | {
      type: "batch";
      moduleId: typeof RESEARCHER_MODULE_ID;
      apiVersion: number;
      taskId: string;
      operation: "generator";
      chunkIndex: number;
      processedCount: number;
      resultCount: number;
      elapsedMs: number;
      buffer: ArrayBuffer;
    }
  | {
      type: "error";
      moduleId: typeof RESEARCHER_MODULE_ID;
      apiVersion: number;
      taskId?: string;
      chunkIndex?: number;
      code: string;
      message: string;
    };
