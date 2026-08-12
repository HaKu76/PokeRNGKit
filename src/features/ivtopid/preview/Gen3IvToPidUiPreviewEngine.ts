import type { Gen3IvToPidRequest, Gen3IvToPidState } from "../domain";
import type {
  Gen3IvToPidSearchEngine,
  Gen3IvToPidSearchOptions,
  Gen3IvToPidSearchSummary,
} from "../search";

const previewStates: Gen3IvToPidState[] = [
  {
    seed: 0x36a3_2c78,
    pid: 0x99e7_1e51,
    sid: 0xbcad,
    method: "channel",
    ability: 1,
    gender12_5: true,
    gender25: true,
    gender50: true,
    gender75: true,
  },
  {
    seed: 0x36a3_2c78,
    pid: 0x02ae_7f2b,
    sid: 0x2370,
    method: "method2",
    ability: 1,
    gender12_5: true,
    gender25: true,
    gender50: true,
    gender75: true,
  },
];

export class Gen3IvToPidUiPreviewEngine implements Gen3IvToPidSearchEngine {
  async search(
    _request: Gen3IvToPidRequest,
    options: Gen3IvToPidSearchOptions = {},
  ): Promise<Gen3IvToPidSearchSummary> {
    const states = previewStates.slice();
    options.onBatch?.(states);
    const progress = { processed: 1, resultCount: states.length, percent: 100 };
    options.onProgress?.(progress);
    return { ...progress, elapsedMs: 0, workerCount: 0, cancelled: false };
  }

  cancel() {}
  dispose() {}
}
