import {
  researcherSearchValue,
  type ResearcherRequest,
  type ResearcherRow,
} from "./domain";

export interface ResearcherSummary {
  rows: ResearcherRow[];
  processedStates: number;
  totalStates: number;
  elapsedMs: number;
  workerCount: 1;
  cancelled: boolean;
}

export interface ResearcherGenerateOptions {
  signal?: AbortSignal;
  onProgress?: (processedStates: number, totalStates: number) => void;
  onBatch?: (rows: ResearcherRow[]) => void;
}

export interface ResearcherEngine {
  generate(
    request: ResearcherRequest,
    options?: ResearcherGenerateOptions,
  ): Promise<ResearcherSummary>;
  cancel(): void;
  dispose(): void;
}

export interface ResearcherSearchResult {
  index: number;
  row: ResearcherRow;
}

export function searchResearcherRows(
  rows: ResearcherRow[],
  request: ResearcherRequest,
  operand: number,
  value: bigint,
  startIndex = 0,
): ResearcherSearchResult | undefined {
  const start = Math.max(0, Math.min(rows.length, Math.trunc(startIndex)));
  for (let index = start; index < rows.length; index++) {
    if (researcherSearchValue(rows[index], operand, request.rng) === value)
      return { index, row: rows[index] };
  }
  return undefined;
}
