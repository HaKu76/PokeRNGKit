import type {
  Gen7EggSeedProgress,
  Gen7EggSeedSearchRequest,
  Gen7EggSeedState,
  Gen7EggSeedSummary,
  Gen7MagikarpRequest,
} from "./domain";

export interface Gen7EggSeedSearchOptions {
  workerCount?: number;
  chunkSize?: number;
  onProgress?(progress: Gen7EggSeedProgress): void;
  onBatch?(batch: Gen7EggSeedState[]): void;
  signal?: AbortSignal;
}

export interface Gen7EggSeedEngine {
  search(
    request: Gen7EggSeedSearchRequest,
    options?: Gen7EggSeedSearchOptions,
  ): Promise<Gen7EggSeedSummary>;
  magikarp(request: Gen7MagikarpRequest): Promise<Gen7EggSeedState>;
  cancel(): void;
  dispose(): void;
}
