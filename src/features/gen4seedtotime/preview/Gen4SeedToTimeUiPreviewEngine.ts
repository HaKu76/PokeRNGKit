import type {
  Gen4SeedToTimeCalibrationRequest,
  Gen4SeedToTimeRequest,
} from "../domain";
import type { Gen4SeedToTimeSearchEngine } from "../search";

export class Gen4SeedToTimeUiPreviewEngine implements Gen4SeedToTimeSearchEngine {
  async search(request: Gen4SeedToTimeRequest) {
    return {
      states: [
        {
          year: request.year,
          month: 7,
          day: 29,
          hour: 0,
          minute: 53,
          second: request.forceSecond ? request.second : 0,
          delay: 600,
        },
      ],
      status: {
        sequenceLow: 0x9249,
        sequenceHigh: 0,
        raikouRoute: request.raikou.enabled ? 31 : 0,
        enteiRoute: request.entei.enabled ? 36 : 0,
        latiRoute: request.lati.enabled ? 12 : 0,
        skips: 3,
      },
      elapsedMs: 0,
      workerCount: 0,
      cancelled: false,
    };
  }

  async calibrate(request: Gen4SeedToTimeCalibrationRequest) {
    return {
      states: [
        {
          seed: 0x60000258,
          ...request.target,
          sequenceLow: 0x9249,
          sequenceHigh: 0,
          raikouRoute: request.raikou.enabled ? 31 : 0,
          enteiRoute: request.entei.enabled ? 36 : 0,
          latiRoute: request.lati.enabled ? 12 : 0,
          skips: 3,
        },
      ],
      elapsedMs: 0,
      workerCount: 0,
      cancelled: false,
    };
  }

  dispose() {}
}
