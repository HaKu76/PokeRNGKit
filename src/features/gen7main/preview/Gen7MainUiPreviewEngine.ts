import {
  GEN7_MAIN_SEED_SPACE,
  validateGen7MainQrRequest,
  validateGen7MainSeedRequest,
  validateGen7MainTimeRequest,
  type Gen7MainQrRequest,
  type Gen7MainSeedRequest,
  type Gen7MainSeedResult,
  type Gen7MainTimeRequest,
} from "../domain";
import type {
  Gen7MainEngine,
  Gen7MainQrSummary,
  Gen7MainSearchOptions,
  Gen7MainSeedSummary,
  Gen7MainTimeSummary,
} from "../search";

function sampleSeed(request: Gen7MainSeedRequest) {
  const key = request.needles.join(",");
  const known: Record<string, number> = {
    "6,10,9,15,10,0,2,7,5,8": 0xbd1646f7,
    "9,10,7,11,12,15,7,7": 0xc31a2f06,
    "2,14,5,6,10,15,7,6,6": 0xf9337724,
  };
  return (
    known[key] ??
    request.needles.reduce(
      (seed, needle, index) =>
        (seed ^ ((needle + 1) * (0x45d9f3b ^ (index * 0x9e3779b9)))) >>> 0,
      request.mode === "id" ? 0x10121132 : 0x417478,
    )
  );
}

export class Gen7MainUiPreviewEngine implements Gen7MainEngine {
  private cancelled = false;

  async searchSeeds(
    request: Gen7MainSeedRequest,
    options: Gen7MainSearchOptions = {},
  ): Promise<Gen7MainSeedSummary> {
    validateGen7MainSeedRequest(request);
    if (options.signal?.aborted) return this.seedCancelled();
    const startedAt = performance.now();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (this.cancelled || options.signal?.aborted) return this.seedCancelled();
    const result: Gen7MainSeedResult = {
      seed: sampleSeed(request),
      correction: request.mode === "id" ? 15 : 0,
    };
    options.onBatch?.([result]);
    options.onProgress?.({
      processedSeeds: GEN7_MAIN_SEED_SPACE,
      totalSeeds: GEN7_MAIN_SEED_SPACE,
      resultCount: 1,
      percent: 100,
    });
    return {
      processedSeeds: GEN7_MAIN_SEED_SPACE,
      totalSeeds: GEN7_MAIN_SEED_SPACE,
      resultCount: 1,
      percent: 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: false,
    };
  }

  async searchQr(
    request: Gen7MainQrRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainQrSummary> {
    validateGen7MainQrRequest(request);
    if (signal?.aborted || this.cancelled)
      return { results: [], elapsedMs: 0, cancelled: true };
    const startedAt = performance.now();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const result = {
      lastClockFrame: request.minFrame + request.needles.length - 1,
      afterQrFrame: request.minFrame + request.needles.length + 1,
    };
    return {
      results: request.minFrame <= request.maxFrame ? [result] : [],
      elapsedMs: performance.now() - startedAt,
      cancelled: false,
    };
  }

  async calculateTime(
    request: Gen7MainTimeRequest,
    signal?: AbortSignal,
  ): Promise<Gen7MainTimeSummary> {
    validateGen7MainTimeRequest(request);
    if (signal?.aborted || this.cancelled)
      return {
        result: { primaryFrames: 0, secondaryFrames: 0 },
        elapsedMs: 0,
        cancelled: true,
      };
    const startedAt = performance.now();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    return {
      result: {
        primaryFrames: (request.targetFrame - request.startingFrame) * 30,
        secondaryFrames: 0,
      },
      elapsedMs: performance.now() - startedAt,
      cancelled: false,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }

  private seedCancelled(): Gen7MainSeedSummary {
    return {
      processedSeeds: 0,
      totalSeeds: GEN7_MAIN_SEED_SPACE,
      resultCount: 0,
      percent: 0,
      elapsedMs: 0,
      workerCount: 0,
      cancelled: true,
    };
  }
}
