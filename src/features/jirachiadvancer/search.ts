import type { Gen3JirachiRequest, Gen3JirachiResult } from "./domain";

export interface Gen3JirachiSearchSummary extends Gen3JirachiResult {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen3JirachiSearchEngine {
  search(request: Gen3JirachiRequest): Promise<Gen3JirachiSearchSummary>;
  cancel(): void;
  dispose(): void;
}
