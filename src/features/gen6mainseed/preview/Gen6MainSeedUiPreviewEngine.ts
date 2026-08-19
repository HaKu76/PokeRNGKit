import {
  gen6MainSeedTaskCount,
  validateGen6MainSeedRequest,
  type Gen6MainSeedRequest,
  type Gen6MainSeedResult,
} from "../domain";
import type { Gen6MainSeedEngine, Gen6MainSeedSearchOptions } from "../search";
import type { Gen6MainSeedSummary } from "../types";

export class Gen6MainSeedUiPreviewEngine implements Gen6MainSeedEngine {
  private cancelled = false;

  async search(
    request: Gen6MainSeedRequest,
    options: Gen6MainSeedSearchOptions = {},
  ): Promise<Gen6MainSeedSummary> {
    validateGen6MainSeedRequest(request);
    this.cancelled = options.signal?.aborted ?? false;
    const startedAt = performance.now();
    const totalStates = Math.min(gen6MainSeedTaskCount(request), 4_096);
    const seeds = [request.startSeed];
    if (request.endSeed > request.startSeed) seeds.push(request.startSeed + 1);
    const results: Gen6MainSeedResult[] = this.cancelled
      ? []
      : seeds.map((seed) =>
          request.mode === "two-wilds"
            ? {
                seed,
                frame1: request.firstMinFrame,
                nature1: (seed + request.firstMinFrame) % 25,
                frame2: request.secondMinFrame,
                nature2: (seed + request.secondMinFrame) % 25,
                gender: 0,
              }
            : {
                seed,
                frame1: request.minFrame,
                nature1: request.nature,
                frame2: 0,
                nature2: 0,
                gender: seed % 252,
              },
        );
    if (results.length) options.onBatch?.(results);
    const progress = {
      processedStates: this.cancelled ? 0 : totalStates,
      totalStates,
      resultCount: results.length,
      percent: this.cancelled ? 0 : 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      results,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: this.cancelled,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
