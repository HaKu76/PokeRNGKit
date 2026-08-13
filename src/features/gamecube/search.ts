import type { GameCubeRequest, GameCubeState } from "./domain";

export interface GameCubeProgress {
  processedStates: number;
  totalStates: number;
  resultCount: number;
  percent: number;
}
export interface GameCubeSummary extends GameCubeProgress {
  elapsedMs: number;
  workerCount: number;
  cancelled: boolean;
  resultLimitReached: boolean;
}
export interface GameCubeOptions {
  signal?: AbortSignal;
  workerCount?: number;
  maxResults?: number;
  onBatch?(states: GameCubeState[]): void;
  onProgress?(progress: GameCubeProgress): void;
}
export interface GameCubeEngine {
  search(
    request: GameCubeRequest,
    options?: GameCubeOptions,
  ): Promise<GameCubeSummary>;
  cancel(): void;
  dispose(): void;
}
