import type {
  Gen3NgcSeedSearchEngine,
  Gen3NgcSeedSearchOptions,
  Gen3NgcSeedSearchSummary,
} from "../search";
import type { Gen3NgcSeedRequest } from "../domain";

export class Gen3NgcSeedUiPreviewEngine implements Gen3NgcSeedSearchEngine {
  async search(
    request: Gen3NgcSeedRequest,
    options: Gen3NgcSeedSearchOptions = {},
  ): Promise<Gen3NgcSeedSearchSummary> {
    const cancelled = options.signal?.aborted ?? false;
    const states = cancelled
      ? []
      : [{ seed: 0x12345678 }, { seed: 0x89abcdef }];
    options.onBatch?.(states);
    const progress = {
      processed: request.seeds?.length ?? 0x1_0000,
      total: request.seeds?.length ?? 0x1_0000,
      resultCount: states.length,
      percent: cancelled ? 0 : 100,
    };
    options.onProgress?.(progress);
    return { ...progress, elapsedMs: 0, workerCount: 0, cancelled };
  }
  cancel() {}
  dispose() {}
}
