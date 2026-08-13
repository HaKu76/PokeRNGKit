import type {
  PokerusFinderState,
  PokerusGen3Request,
  PokerusPtHgssRequest,
} from "./domain";

export interface PokerusFinderSearchSummary {
  states: PokerusFinderState[];
  processed: number;
  total: number;
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
}

export interface PokerusFinderSearchEngine {
  searchGen3(
    request: PokerusGen3Request,
    options?: { signal?: AbortSignal },
  ): Promise<PokerusFinderSearchSummary>;
  searchPtHgss(
    request: PokerusPtHgssRequest,
    options?: { signal?: AbortSignal },
  ): Promise<PokerusFinderSearchSummary>;
  cancel(): void;
  dispose(): void;
}
