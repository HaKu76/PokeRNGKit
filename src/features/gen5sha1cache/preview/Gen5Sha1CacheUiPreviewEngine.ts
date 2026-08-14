import {
  createGen5Sha1CacheData,
  gen5Sha1CacheUnit,
  gen5Sha1CacheUnitCount,
  validateGen5Sha1CacheRequest,
  type Gen5Sha1CacheRequest,
} from "../domain";
import type { Gen5Sha1CacheEngine, Gen5Sha1CacheOptions } from "../search";

export class Gen5Sha1CacheUiPreviewEngine implements Gen5Sha1CacheEngine {
  private cancelled = false;

  async search(
    request: Gen5Sha1CacheRequest,
    options: Gen5Sha1CacheOptions = {},
  ) {
    validateGen5Sha1CacheRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cache = createGen5Sha1CacheData(request);
    const totalUnits = gen5Sha1CacheUnitCount(request);
    const cancelled = this.cancelled || options.signal?.aborted === true;
    if (!cancelled) {
      const unit = gen5Sha1CacheUnit(request, 0);
      cache.normal.push({
        keyLow: (unit.buttonMask | (45_296 << 12)) >>> 0,
        keyHigh: (unit.dateOffset | (unit.timer0 << 16)) >>> 0,
        seedLow: 0x89ab_cdef,
        seedHigh: 0x0123_4567,
      });
    }
    const processedUnits = cancelled ? 0 : totalUnits;
    options.onProgress?.({
      processedUnits,
      totalUnits,
      resultCount: cancelled ? 0 : 1,
      percent: cancelled ? 0 : 100,
    });
    return {
      cache,
      processedUnits,
      totalUnits,
      resultCount: cancelled ? 0 : 1,
      percent: cancelled ? 0 : 100,
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
