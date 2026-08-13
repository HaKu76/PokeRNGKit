import type { Gen3PidToIvRequest, Gen3PidToIvState } from "./domain";

export interface Gen3PidToIvSearchSummary {
  states: Gen3PidToIvState[];
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface Gen3PidToIvSearchEngine {
  search(request: Gen3PidToIvRequest): Promise<Gen3PidToIvSearchSummary>;
  cancel(): void;
  dispose(): void;
}
