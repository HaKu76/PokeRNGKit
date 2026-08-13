import type {
  PokerusFinderSearchEngine,
  PokerusFinderSearchSummary,
} from "../search";
import type { PokerusGen3Request, PokerusPtHgssRequest } from "../domain";

const previewStates = [
  { frame: 301, seed: 0x1234 },
  { frame: 415, seed: 0x5678 },
];

export class PokerusFinderUiPreviewEngine implements PokerusFinderSearchEngine {
  async searchGen3(
    request: PokerusGen3Request,
    options: { signal?: AbortSignal } = {},
  ): Promise<PokerusFinderSearchSummary> {
    const cancelled = options.signal?.aborted ?? false;
    return {
      states: cancelled ? [] : previewStates,
      processed: cancelled ? 0 : request.maxFrames,
      total: request.maxFrames,
      elapsedMs: 0,
      workerCount: 0,
      cancelled,
    };
  }
  async searchPtHgss(
    _request: PokerusPtHgssRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<PokerusFinderSearchSummary> {
    const cancelled = options.signal?.aborted ?? false;
    return {
      states: cancelled
        ? []
        : [{ frame: 24, seed: 0x12345678, delay: 601, second: 0 }],
      processed: cancelled ? 0 : 24060,
      total: 24060,
      elapsedMs: 0,
      workerCount: 0,
      cancelled,
    };
  }
  cancel() {}
  dispose() {}
}
