import { Gen6EventUiPreviewEngine } from "./Gen6EventUiPreviewEngine";
import {
  gen6EventTimeTaskCount,
  type Gen6EventTimeRequest,
  type Gen6EventTimeResult,
} from "../timeDomain";
import type {
  Gen6EventTimeEngine,
  Gen6EventTimeSearchOptions,
  Gen6EventTimeSummary,
} from "../timeSearch";
export class Gen6EventTimePreviewEngine implements Gen6EventTimeEngine {
  private readonly preview = new Gen6EventUiPreviewEngine();
  private cancelled = false;
  async search(
    request: Gen6EventTimeRequest,
    options: Gen6EventTimeSearchOptions = {},
  ): Promise<Gen6EventTimeSummary> {
    this.cancelled = false;
    const startedAt = performance.now();
    const totalStates = gen6EventTimeTaskCount(request);
    const results: Gen6EventTimeResult[] = [];
    await this.preview.search(
      { ...request, seed: 0 },
      {
        onBatch: (batch) =>
          batch.slice(0, 12).forEach((result) =>
            results.push({
              ...result,
              initialSeed: 0x12345678,
              epoch: request.startEpoch,
            }),
          ),
      },
    );
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
    if (results.length) options.onBatch?.(results);
    const progress = {
      processedStates: totalStates,
      totalStates,
      resultCount: results.length,
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
