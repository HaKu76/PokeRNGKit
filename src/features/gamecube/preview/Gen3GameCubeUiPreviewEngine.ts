import type {
  GameCubeEngine,
  GameCubeOptions,
  GameCubeSummary,
} from "../search";
import type { GameCubeRequest, GameCubeState } from "../domain";
import { passesPerfectIvFilter } from "../../shared/perfectIvFilter";

export class Gen3GameCubeUiPreviewEngine implements GameCubeEngine {
  private cancelled = false;
  async search(
    request: GameCubeRequest,
    options: GameCubeOptions = {},
  ): Promise<GameCubeSummary> {
    this.cancelled = false;
    const startedAt = performance.now();
    const states: GameCubeState[] = [];
    const totalStates =
      request.operation === "generator" ? request.maxAdvances + 1 : 1;
    for (let index = 0; index < Math.min(8, totalStates); index++) {
      if (this.cancelled || options.signal?.aborted) break;
      const value = (request.seed + index * 0x6c078965) >>> 0;
      const ivs: [number, number, number, number, number, number] = [
        value & 31,
        (value >>> 5) & 31,
        (value >>> 10) & 31,
        (value >>> 15) & 31,
        (value >>> 20) & 31,
        (value >>> 25) & 31,
      ];
      const ability = value & 1;
      const gender = (value >>> 1) & 1;
      const nature = value % 25;
      const shiny = 0;
      if (
        ivs.some(
          (iv, ivIndex) =>
            iv < request.filters.ivMin[ivIndex] ||
            iv > request.filters.ivMax[ivIndex],
        ) ||
        !passesPerfectIvFilter(
          ivs,
          request.filters.perfectIvValue,
          request.filters.perfectIvCount,
        ) ||
        (request.filters.natureMask & (1 << nature)) === 0 ||
        (request.filters.ability !== "any" &&
          (request.filters.ability === "first"
            ? ability !== 0
            : ability !== 1)) ||
        (request.filters.gender !== "any" &&
          (request.filters.gender === "male" ? gender !== 0 : gender !== 1)) ||
        request.filters.shiny !== "any"
      )
        continue;
      states.push({
        advancesOrSeed:
          request.operation === "generator"
            ? request.initialAdvances + index
            : value,
        pid: value,
        ivs,
        ability,
        gender,
        level: request.template.level,
        nature,
        shiny,
      });
    }
    options.onBatch?.(states);
    options.onProgress?.({
      processedStates: states.length,
      totalStates,
      resultCount: states.length,
      percent:
        states.length === totalStates
          ? 100
          : (states.length / totalStates) * 100,
    });
    return {
      processedStates: states.length,
      totalStates,
      resultCount: states.length,
      percent:
        states.length === totalStates
          ? 100
          : (states.length / totalStates) * 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 0,
      cancelled: this.cancelled || Boolean(options.signal?.aborted),
      resultLimitReached: false,
    };
  }
  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancel();
  }
}
