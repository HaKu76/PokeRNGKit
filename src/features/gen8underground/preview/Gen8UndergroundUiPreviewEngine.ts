import {
  GEN8_UNDERGROUND_LEVEL_RANGES,
  gen8UndergroundTaskCount,
  normalizeGen8UndergroundSeed,
  validateGen8UndergroundRequest,
  type Gen8UndergroundRequest,
  type Gen8UndergroundResult,
} from "../domain";
import type {
  Gen8UndergroundEngine,
  Gen8UndergroundSearchOptions,
  Gen8UndergroundSummary,
} from "../search";

export class Gen8UndergroundUiPreviewEngine implements Gen8UndergroundEngine {
  private cancelled = false;

  async search(
    request: Gen8UndergroundRequest,
    options: Gen8UndergroundSearchOptions = {},
  ): Promise<Gen8UndergroundSummary> {
    validateGen8UndergroundRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalStates = gen8UndergroundTaskCount(request);
    const count = Math.min(
      totalStates,
      options.maxResults ?? request.resultLimit,
    );
    const levels = GEN8_UNDERGROUND_LEVEL_RANGES[request.levelFlag];
    const species = request.filters.species[0];
    const seed = normalizeGen8UndergroundSeed(request.seed0);
    const results: Gen8UndergroundResult[] = [];
    for (let index = 0; index < count; index++) {
      if (this.cancelled || options.signal?.aborted) break;
      if (species !== undefined) {
        const ivs = Array.from(
          { length: 6 },
          (_, ivIndex) => (index * 7 + ivIndex * 5) % 32,
        ) as Gen8UndergroundResult["ivs"];
        results.push({
          advances: request.initialAdvances + index,
          eggMove: 33,
          item: 0,
          species,
          level: levels[0] + (index % (levels[1] - levels[0] + 1)),
          ec: seed.slice(-8),
          pid: (index + 1).toString(16).toUpperCase().padStart(8, "0"),
          shiny: 0,
          nature: index % 25,
          ability: index % 2,
          abilityIndex: 1,
          ivs,
          stats: ivs.map(
            (value) => value + 30,
          ) as Gen8UndergroundResult["stats"],
          gender: index % 2,
          height: (index * 17) % 256,
          weight: (index * 29) % 256,
          characteristic: index % 30,
        });
      }
    }
    if (results.length) options.onBatch?.(results);
    const processedStates = this.cancelled ? 0 : count;
    options.onProgress?.({
      processedStates,
      totalStates,
      resultCount: results.length,
      percent: (processedStates / totalStates) * 100,
    });
    return {
      processedStates,
      totalStates,
      resultCount: results.length,
      percent: (processedStates / totalStates) * 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: this.cancelled || Boolean(options.signal?.aborted),
      resultLimitReached: count < totalStates,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
