import type { Gen3PidToIvRequest } from "../domain";
import type { Gen3PidToIvSearchEngine } from "../search";

export class Gen3PidToIvUiPreviewEngine implements Gen3PidToIvSearchEngine {
  async search(_request: Gen3PidToIvRequest) {
    return {
      states: [
        {
          seed: 171270561,
          method: "method-1" as const,
          hp: 30,
          atk: 11,
          def: 26,
          spa: 19,
          spd: 20,
          spe: 17,
        },
        {
          seed: 2460605445,
          method: "xd-colo" as const,
          hp: 9,
          atk: 21,
          def: 30,
          spa: 11,
          spd: 10,
          spe: 14,
        },
      ],
      elapsedMs: 0,
      workerCount: 0,
      cancelled: false,
    };
  }
  cancel() {}
  dispose() {}
}
