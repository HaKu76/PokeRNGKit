import type {
  Gen6MainSeedProgress,
  Gen6MainSeedRequest,
  Gen6MainSeedResult,
  Gen6MainSeedSummary,
} from "./types";

export type { Gen6MainSeedProgress, Gen6MainSeedSummary } from "./types";

export interface Gen6MainSeedSearchOptions {
  workerCount?: number;
  chunkSize?: number;
  signal?: AbortSignal;
  onBatch?(results: Gen6MainSeedResult[]): void;
  onProgress?(progress: Gen6MainSeedProgress): void;
}

export interface Gen6MainSeedEngine {
  search(
    request: Gen6MainSeedRequest,
    options?: Gen6MainSeedSearchOptions,
  ): Promise<Gen6MainSeedSummary>;
  cancel(): void;
  dispose(): void;
}
