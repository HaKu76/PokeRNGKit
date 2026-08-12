import type {
  Gen3InitialSeedState,
  Gen3RsInitialSeedRequest,
  Gen3TargetInitialSeedRequest,
} from "../domain";
import type {
  Gen3InitialSeedSearchOptions,
  Gen3InitialSeedSearchSummary,
} from "../search";

const rsPreviewStates: Gen3InitialSeedState[] = [
  { initialSeed: 0x05a0, advances: 0 },
  { initialSeed: 0xc19b, advances: 36724 },
];
const targetPreviewStates: Gen3InitialSeedState[] = [
  { initialSeed: 0x05a0, advances: 1 },
  { initialSeed: 0xc19b, advances: 36725 },
];

export class Gen3InitialSeedUiPreviewEngine {
  async findRsIds(
    _request: Gen3RsInitialSeedRequest,
    options: Gen3InitialSeedSearchOptions = {},
  ): Promise<Gen3InitialSeedSearchSummary> {
    options.onBatch?.(rsPreviewStates);
    const progress = {
      processedStates: 0x1_0000,
      totalStates: 0x1_0000,
      resultCount: rsPreviewStates.length,
      percent: 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: 0,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: false,
    };
  }

  async findTarget(
    _request: Gen3TargetInitialSeedRequest,
    options: Gen3InitialSeedSearchOptions = {},
  ): Promise<Gen3InitialSeedSearchSummary> {
    const states = targetPreviewStates.slice(0, _request.maxResults);
    options.onBatch?.(states);
    const progress = {
      processedStates: 100000,
      totalStates: 0xffff_ffff,
      resultCount: states.length,
      percent: (100000 / 0xffff_ffff) * 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: 0,
      workerCount: 2,
      cancelled: false,
      resultLimitReached: states.length === _request.maxResults,
    };
  }

  cancel() {}

  dispose() {}
}
