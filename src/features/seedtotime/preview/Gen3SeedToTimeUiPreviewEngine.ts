import type { Gen3SeedToTimeRequest } from "../domain";
import type {
  Gen3SeedToTimeSearchEngine,
  Gen3SeedToTimeSearchOptions,
  Gen3SeedToTimeSearchSummary,
} from "../search";

const previewStates = [
  { year: 2000, month: 3, day: 30, hour: 18, minute: 22 },
  { year: 2000, month: 3, day: 31, hour: 0, minute: 22 },
  { year: 2000, month: 6, day: 29, hour: 18, minute: 44 },
];

export class Gen3SeedToTimeUiPreviewEngine implements Gen3SeedToTimeSearchEngine {
  async search(
    _request: Gen3SeedToTimeRequest,
    _options: Gen3SeedToTimeSearchOptions = {},
  ): Promise<Gen3SeedToTimeSearchSummary> {
    return {
      originSeed: 0,
      advances: 0,
      states: previewStates,
      elapsedMs: 0,
      workerCount: 0,
      cancelled: false,
    };
  }

  cancel() {}
  dispose() {}
}
