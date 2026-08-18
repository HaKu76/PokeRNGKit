import {
  gen6DexNavTaskCount,
  validateGen6DexNavRequest,
  type Gen6DexNavRequest,
  type Gen6DexNavResult,
} from "../domain";
import type { Gen6DexNavEngine, Gen6DexNavSearchOptions } from "../search";
export class Gen6DexNavUiPreviewEngine implements Gen6DexNavEngine {
  private cancelled = false;
  async search(
    request: Gen6DexNavRequest,
    options: Gen6DexNavSearchOptions = {},
  ) {
    validateGen6DexNavRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalStates = gen6DexNavTaskCount(request);
    const count = Math.min(totalStates, request.resultLimit);
    const results = Array.from(
      { length: count },
      (_, index): Gen6DexNavResult => ({
        frame: request.minFrame + index,
        x: -9 + (index % 18),
        y: -7 + (index % 14),
        slot: index % (request.encounterType === "surf" ? 5 : 12),
        slotType: index % 4,
        additionalDelay: 0,
        lead: index % 100,
        levelBoost: Math.floor(request.chainLength / 5),
        fluteBoost: (index % 4) + 1,
        boost: index % 5 === 4,
        synchronize: index % 2 === 0,
        hiddenAbility: request.navHa || index % 7 === 0,
        eggMove: index % 3 === 0,
        forcedShiny: request.forcedShiny || index % 11 === 0,
        species: request.navUnown
          ? 201
          : (request.slots[index % request.slots.length]?.species ?? 0),
        level: Math.min(
          100,
          (request.slots[index % request.slots.length]?.level ?? 0) +
            Math.floor(request.chainLength / 5),
        ),
        grade:
          request.searchLevel < 5
            ? 0
            : request.searchLevel < 10
              ? 1
              : request.searchLevel < 25
                ? 2
                : request.searchLevel < 50
                  ? 3
                  : request.searchLevel < 100
                    ? 4
                    : 5,
        potential: Math.min(3, request.potential || index % 4),
        heldItem: index % 4,
        searchLevel: request.searchLevel,
        random: request.tinySeed,
      }),
    );
    if (!this.cancelled && !options.signal?.aborted) options.onBatch?.(results);
    const processed =
      this.cancelled || options.signal?.aborted ? 0 : totalStates;
    const progress = {
      processedStates: processed,
      totalStates,
      resultCount: this.cancelled ? 0 : results.length,
      percent: (processed / totalStates) * 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1 as const,
      cancelled: this.cancelled || options.signal?.aborted === true,
      resultLimitReached: count < totalStates,
    };
  }
  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancelled = true;
  }
}
