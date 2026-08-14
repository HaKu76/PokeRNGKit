import {
  createGen5IvCacheData,
  GEN5_IVCACHE_TOTAL_SEEDS,
  validateGen5IvCacheExecution,
  type Gen5IvCacheRequest,
} from "../domain";
import type {
  Gen5IvCacheEngine,
  Gen5IvCacheOptions,
  Gen5IvCacheSummary,
} from "../search";

export class Gen5IvCacheUiPreviewEngine implements Gen5IvCacheEngine {
  private cancelled = false;

  async search(
    request: Gen5IvCacheRequest,
    options: Gen5IvCacheOptions = {},
  ): Promise<Gen5IvCacheSummary> {
    if (validateGen5IvCacheExecution(request).length > 0)
      throw new RangeError("Invalid Gen 5 IV Cache request.");
    this.cancelled = false;
    await Promise.resolve();
    const cache = createGen5IvCacheData(request);
    const cancelled = this.cancelled || options.signal?.aborted === true;
    if (!cancelled) {
      cache.entralink.set(0, [0x1234_5678]);
      cache.normal.set(0, [0x8765_4321]);
      cache.roamer.set(0, [0x0102_0304]);
    }
    const processedSeeds = cancelled ? 0 : GEN5_IVCACHE_TOTAL_SEEDS;
    const resultCount = cancelled ? 0 : 3;
    options.onProgress?.({
      processedSeeds,
      totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
      resultCount,
      percent: cancelled ? 0 : 100,
    });
    return {
      cache,
      processedSeeds,
      totalSeeds: GEN5_IVCACHE_TOTAL_SEEDS,
      resultCount,
      elapsedMs: 0,
      workerCount: 1,
      cancelled,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
