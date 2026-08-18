import {
  gen6PokeRadarTaskCount,
  validateGen6PokeRadarRequest,
  type Gen6PokeRadarPatch,
  type Gen6PokeRadarRequest,
  type Gen6PokeRadarResult,
} from "../domain";
import type {
  Gen6PokeRadarEngine,
  Gen6PokeRadarSearchOptions,
} from "../search";
export class Gen6PokeRadarUiPreviewEngine implements Gen6PokeRadarEngine {
  private cancelled = false;
  async search(
    request: Gen6PokeRadarRequest,
    options: Gen6PokeRadarSearchOptions = {},
  ) {
    validateGen6PokeRadarRequest(request);
    this.cancelled = false;
    const total = gen6PokeRadarTaskCount(request),
      count = Math.min(total, request.resultLimit);
    const results = Array.from(
      { length: count },
      (_, i): Gen6PokeRadarResult => {
        const patch = (
          ring: number,
          state: Gen6PokeRadarPatch["state"],
        ): Gen6PokeRadarPatch => ({
          ring,
          direction: i % 4,
          location: i % (ring * 2 + 3),
          state,
          x: Math.min(8, 3 - ring + (i % (ring * 2 + 3))),
          y: Math.max(0, 3 - ring),
        });
        return {
          frame: request.minFrame + i,
          music: i % 100,
          musicType: i % 50 === 0 ? "M" : "-",
          boost: request.boost && i % 2 === 0,
          shiny: i % 11 === 0,
          patches: [
            patch(0, i % 11 === 0 ? "shiny" : "good"),
            patch(1, "bad"),
            patch(2, "good"),
            patch(3, "bad"),
            patch(i % 3, "empty"),
          ],
        };
      },
    );
    if (!this.cancelled && !options.signal?.aborted) options.onBatch?.(results);
    const processed = this.cancelled || options.signal?.aborted ? 0 : total,
      progress = {
        processedStates: processed,
        totalStates: total,
        resultCount: processed ? results.length : 0,
        percent: (processed / total) * 100,
      };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: 0,
      workerCount: 1 as const,
      cancelled: !processed,
      resultLimitReached: count < total,
    };
  }
  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancelled = true;
  }
}
