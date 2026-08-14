import {
  GEN5_ADJACENT_SEEDS_PREVIEW_COUNT,
  totalGen5AdjacentStates,
  validateGen5AdjacentPreviewRequest,
  validateGen5AdjacentSeedsRequest,
  type Gen5AdjacentPreviewRequest,
  type Gen5AdjacentSeedsRequest,
} from "../domain";
import type {
  Gen5AdjacentSeedsEngine,
  Gen5AdjacentSeedsOptions,
} from "../search";

export class Gen5AdjacentSeedsUiPreviewEngine implements Gen5AdjacentSeedsEngine {
  private cancelled = false;

  async generate(
    request: Gen5AdjacentSeedsRequest,
    options: Gen5AdjacentSeedsOptions = {},
  ) {
    validateGen5AdjacentSeedsRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const totalStates = totalGen5AdjacentStates(request);
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const results = cancelled
      ? []
      : [
          {
            seed: "5A0F5EED12345678",
            dateTime: request.dateTime.replace("T", " "),
            timer0: request.timer0Min,
            ivAdvance: request.initialIVAdvance,
            ivs: [31, 12, 24, 8, 19, 30] as [
              number,
              number,
              number,
              number,
              number,
              number,
            ],
            pidAdvance: 47,
            target: true,
          },
        ];
    const processedStates = cancelled ? 0 : totalStates;
    options.onProgress?.({
      processedStates,
      totalStates,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
    });
    return {
      results,
      processedStates,
      totalStates,
      elapsedMs: 0,
      workerCount: 1,
      cancelled,
    };
  }

  async preview(request: Gen5AdjacentPreviewRequest) {
    validateGen5AdjacentPreviewRequest(request);
    await Promise.resolve();
    return Array.from(
      { length: GEN5_ADJACENT_SEEDS_PREVIEW_COUNT },
      (_, index) => (request.mode === "chatot" ? index * 4 : index % 8),
    );
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
