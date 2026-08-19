import type {
  Gen7StationaryTimeEngine,
  Gen7StationaryTimeProgress,
  Gen7StationaryTimeSearchOptions,
  Gen7StationaryTimeSummary,
} from "../search";
import {
  gen7StationaryTimeTaskCount,
  type Gen7StationaryRequest,
  type Gen7StationaryTimeRequest,
  type Gen7StationaryTimeResult,
} from "../domain";
import { Gen7StationaryUiPreviewEngine } from "./Gen7StationaryUiPreviewEngine";

export class Gen7StationaryTimeUiPreviewEngine implements Gen7StationaryTimeEngine {
  private readonly preview = new Gen7StationaryUiPreviewEngine();
  private cancelled = false;

  async search(
    request: Gen7StationaryTimeRequest,
    options: Gen7StationaryTimeSearchOptions = {},
  ): Promise<Gen7StationaryTimeSummary> {
    this.cancelled = false;
    const baseRequest: Gen7StationaryRequest = { ...request, seed: 0 };
    const start = performance.now();
    const totalStates = gen7StationaryTimeTaskCount(request);
    const results: Gen7StationaryTimeResult[] = [];
    await this.preview.search(baseRequest, {
      maxResults: Math.min(request.resultLimit, 12),
      onBatch: (batch) => {
        batch.forEach((result) =>
          results.push({
            ...result,
            initialSeed: 0x1234_5678,
            epoch: request.startEpoch,
          }),
        );
      },
    });
    if (this.cancelled) {
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: performance.now() - start,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    }
    if (results.length) options.onBatch?.(results);
    const progress: Gen7StationaryTimeProgress = {
      processedStates: totalStates,
      totalStates,
      resultCount: results.length,
      percent: 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: performance.now() - start,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: false,
    };
  }

  cancel() {
    this.cancelled = true;
    this.preview.cancel();
  }

  dispose() {
    this.preview.dispose();
  }
}
