import type {
  Gen6StationaryTimeEngine,
  Gen6StationaryTimeSearchOptions,
  Gen6StationaryTimeSummary,
} from "../timeSearch";
import {
  gen6StationaryTimeTaskCount,
  type Gen6StationaryTimeRequest,
} from "../timeDomain";
import { Gen6StationaryUiPreviewEngine } from "./Gen6StationaryUiPreviewEngine";

export class Gen6StationaryTimePreviewEngine implements Gen6StationaryTimeEngine {
  private readonly preview = new Gen6StationaryUiPreviewEngine();
  private cancelled = false;
  async search(
    request: Gen6StationaryTimeRequest,
    options: Gen6StationaryTimeSearchOptions = {},
  ): Promise<Gen6StationaryTimeSummary> {
    this.cancelled = false;
    const startedAt = performance.now();
    const totalStates = gen6StationaryTimeTaskCount(request);
    const base = { ...request, seed: 0 };
    const previewResults: import("../timeDomain").Gen6StationaryTimeResult[] =
      [];
    await this.preview.search(base, {
      onBatch: (batch) =>
        batch.slice(0, 12).forEach((result) =>
          previewResults.push({
            ...result,
            initialSeed: 0x12345678,
            epoch: request.startEpoch,
          }),
        ),
    });
    if (this.cancelled)
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    if (previewResults.length) options.onBatch?.(previewResults);
    const progress = {
      processedStates: totalStates,
      totalStates,
      resultCount: previewResults.length,
      percent: 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: performance.now() - startedAt,
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
