import {
  gen6TinyRockSmashTaskCount,
  validateGen6TinyRockSmashRequest,
  type Gen6TinyRockSmashRequest,
  type Gen6TinyRockSmashResult,
} from "../domain";
import type {
  Gen6TinyRockSmashEngine,
  Gen6TinyRockSmashSearchOptions,
  Gen6TinyRockSmashSummary,
} from "../search";

function previewResult(
  request: Gen6TinyRockSmashRequest,
  index: number,
): Gen6TinyRockSmashResult {
  const random = (Math.imul(index + 1, 0x9e3779b9) ^ request.seed) >>> 0;
  const slot = (random % 5) + 1;
  const trigger = random % 3 === 0;
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
      request.interactFrame + 18,
      request.interactFrame + 66,
      request.interactFrame + 276,
    ],
    species: request.slots[slot - 1]?.species ?? 0,
    level: request.slots[slot - 1]?.level ?? 1,
  };
}

export class Gen6TinyRockSmashUiPreviewEngine implements Gen6TinyRockSmashEngine {
  private cancelled = false;

  async search(
    request: Gen6TinyRockSmashRequest,
    options: Gen6TinyRockSmashSearchOptions = {},
  ): Promise<Gen6TinyRockSmashSummary> {
    validateGen6TinyRockSmashRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6TinyRockSmashTaskCount(request), 5_000);
    const accepted: Gen6TinyRockSmashResult[] = [];
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
            ((!filters.triggerOnly || result.trigger) &&
              (!filters.synchronize || result.synchronize) &&
              (!filters.safeOnly || !result.risky) &&
              (filters.flute === 0 || filters.flute === result.flute) &&
              (filters.slotMask === 0 ||
                (filters.slotMask & (1 << result.slot)) !== 0))) &&
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
