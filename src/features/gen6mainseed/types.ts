import type { Gen6MainSeedRequest, Gen6MainSeedResult } from "./domain";

export type { Gen6MainSeedRequest, Gen6MainSeedResult };

export interface Gen6MainSeedProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}

export interface Gen6MainSeedSummary extends Gen6MainSeedProgress {
  results: Gen6MainSeedResult[];
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}
