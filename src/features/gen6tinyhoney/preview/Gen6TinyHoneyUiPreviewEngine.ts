import {
  gen6TinyHoneyTaskCount,
  validateGen6TinyHoneyRequest,
  type Gen6TinyHoneyRequest,
  type Gen6TinyHoneyResult,
} from "../domain";
import type {
  Gen6TinyHoneyEngine,
  gen6TinyHoneySearchOptions,
  Gen6TinyHoneySummary,
} from "../search";

function previewResult(
  request: Gen6TinyHoneyRequest,
  index: number,
): Gen6TinyHoneyResult {
  const random = (Math.imul(index + 1, 0x9e3779b9) ^ request.seed) >>> 0;
  const slot = (random % (request.slotType === 4 ? 5 : 12)) + 1;
  const trigger = false;
  const synchronize = random % 2 === 0;
  const flute = request.oras ? (Math.floor(random / 7) % 4) + 1 : 0;
  const risky = index % 11 === 0;
  return {
    index,
    random: random % 100,
    state: [0, 0, 0, random],
    initialSeed: request.inputMode === "seed" ? request.seed : 0,
    encounter: random % 3,
    trigger,
    synchronize,
    slot,
    itemSlot: random % 100 < 50 ? 0 : random % 100 < 55 ? 1 : 2,
    flute,
    actualDelay: 276,
    risky,
    timeline: [
      request.longBlinkRand + 124,
      request.longBlinkRand + request.honeyDelay,
    ],
    species: request.slots[slot - 1]?.species ?? 0,
    level: request.slots[slot - 1]?.level ?? 1,
  };
}

export class Gen6TinyHoneyUiPreviewEngine implements Gen6TinyHoneyEngine {
  private cancelled = false;

  async search(
    request: Gen6TinyHoneyRequest,
    options: gen6TinyHoneySearchOptions = {},
  ): Promise<Gen6TinyHoneySummary> {
    validateGen6TinyHoneyRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6TinyHoneyTaskCount(request), 5_000);
    const accepted: Gen6TinyHoneyResult[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    try {
      for (
        let offset = 0;
        offset < totalStates && !this.cancelled;
        offset += 1
      ) {
        const result = previewResult(request, request.minIndex + offset);
        const filters = request.filters;
        if (
          (filters.disabled ||
            ((!filters.synchronize || result.synchronize) &&
              (!filters.safeOnly || !result.risky) &&
              (filters.flute === 0 || filters.flute === result.flute) &&
              (filters.slotMask === 0 ||
                (filters.slotMask & (1 << (result.slot - 1))) !== 0))) &&
          accepted.length < request.resultLimit
        )
          accepted.push(result);
        processedStates += 1;
        if (accepted.length >= request.resultLimit) break;
      }
      if (accepted.length) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached: accepted.length >= request.resultLimit,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
