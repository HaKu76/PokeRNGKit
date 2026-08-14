import {
  validateGen5CalibrationRequest,
  type Gen5CalibrationRequest,
} from "../domain";
import type {
  Gen5CalibrationEngine,
  Gen5CalibrationOptions,
  Gen5CalibrationSummary,
} from "../search";

const PREVIEW_SEED = "5A0F5EED12345678";

function totalStates(request: Gen5CalibrationRequest) {
  return (
    (request.maxSeconds - request.minSeconds + 1) *
    (request.maxVCount - request.minVCount + 1) *
    (request.maxTimer0 - request.minTimer0 + 1) *
    (request.maxGxStat - request.minGxStat + 1) *
    (request.maxVFrame - request.minVFrame + 1)
  );
}

export class Gen5ProfilesUiPreviewEngine implements Gen5CalibrationEngine {
  private cancelled = false;

  async search(
    request: Gen5CalibrationRequest,
    options: Gen5CalibrationOptions = {},
  ): Promise<Gen5CalibrationSummary> {
    validateGen5CalibrationRequest(request);
    this.cancelled = false;
    const total = totalStates(request);
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const processedStates = cancelled ? 0 : total;
    const results = cancelled
      ? []
      : [
          {
            seed: request.mode === "seed" ? request.seed : PREVIEW_SEED,
            seconds: request.minSeconds,
            vcount: request.minVCount,
            timer0: request.minTimer0,
            gxstat: request.minGxStat,
            vframe: request.minVFrame,
          },
        ];
    options.onProgress?.({
      processedStates,
      totalStates: total,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
    });
    return {
      results,
      processedStates,
      totalStates: total,
      elapsedMs: 0,
      workerCount: 1,
      cancelled,
      resultLimitReached: false,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
