import type {
  Gen5AdjacentPreviewRequest,
  Gen5AdjacentProgress,
  Gen5AdjacentSeedsRequest,
  Gen5AdjacentSeedsSummary,
} from "./domain";

export interface Gen5AdjacentSeedsOptions {
  signal?: AbortSignal;
  workerCount?: number;
  onProgress?(progress: Gen5AdjacentProgress): void;
}

export interface Gen5AdjacentSeedsEngine {
  generate(
    request: Gen5AdjacentSeedsRequest,
    options?: Gen5AdjacentSeedsOptions,
  ): Promise<Gen5AdjacentSeedsSummary>;
  preview(request: Gen5AdjacentPreviewRequest): Promise<number[]>;
  cancel(): void;
  dispose(): void;
}
