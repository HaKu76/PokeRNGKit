import {
  GEN7_STATIONARY_MAX_RESULTS,
  gen7StationaryEffectiveTsv,
  gen7StationaryHiddenPower,
  gen7StationaryResultPassesFilters,
  gen7StationaryTaskCount,
  validateGen7StationaryRequest,
  type Gen7StationaryIvTuple,
  type Gen7StationaryRequest,
  type Gen7StationaryResult,
} from "../domain";
import type {
  Gen7StationaryEngine,
  Gen7StationarySearchOptions,
  Gen7StationarySummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(
  request: Gen7StationaryRequest,
  frame: number,
): Gen7StationaryResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const high = mix(low ^ 0xa5a5a5a5);
  let pid = mix(high ^ 0x7f4a7c15);
  const tsv = gen7StationaryEffectiveTsv(request);
  let xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const forced = frame % 113 === 0 && !request.encounter.shinyLocked;
  if (request.forcedShiny || forced) {
    const pidLow = pid & 0xffff;
    pid = ((((tsv << 4) + request.trv) ^ pidLow) << 16) | pidLow;
    xorValue = (pid >>> 16) ^ (pid & 0xffff);
  } else if (request.encounter.shinyLocked && xorValue >>> 4 === tsv) {
    pid ^= 0x10000000;
    xorValue = (pid >>> 16) ^ (pid & 0xffff);
  }
  const ivs = [0, 1, 2, 3, 4, 5].map(
    (index) => (mix(low + index * 0x10203) >>> 8) & 0x1f,
  ) as Gen7StationaryIvTuple;
  const blink =
    request.encounter.npc === 0
      ? frame % 97 === 0
        ? 30
        : frame % 31 === 0
          ? 5
          : frame % 29 === 0
            ? 1
            : 0
      : frame % 43 === 0
        ? 3
        : frame % 17 === 0
          ? 2
          : frame % 37 === 0
            ? 1
            : 0;
  const shiny = xorValue >>> 4 === tsv;
  return {
    frame,
    realTimeFrames: (frame - request.minFrame) * 2,
    random: (BigInt(high) << 32n) | BigInt(low),
    ec: mix(low ^ 0x31415926),
    pid,
    ivs,
    nature: mix(pid) % 25,
    ability: (mix(pid ^ 0x55aa55aa) % 3) + 1,
    gender: request.encounter.randomGender
      ? (mix(pid ^ low) & 1) + 1
      : request.encounter.gender,
    hiddenPower: gen7StationaryHiddenPower(ivs),
    shiny: shiny ? ((xorValue & 0xf) === request.trv ? 2 : 1) : 0,
    synchronize: request.encounter.alwaysSync || frame % 2 === 0,
    blink,
    delay: request.considerDelay
      ? Math.max(0, Math.trunc(request.encounter.delay / 2) + 2)
      : 0,
    psv: xorValue >>> 4,
    prv: xorValue & 0xf,
  };
}

export class Gen7StationaryUiPreviewEngine implements Gen7StationaryEngine {
  private cancelled = false;

  async search(
    request: Gen7StationaryRequest,
    options: Gen7StationarySearchOptions = {},
  ): Promise<Gen7StationarySummary> {
    validateGen7StationaryRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7StationaryTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults ?? GEN7_STATIONARY_MAX_RESULTS,
      ),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7StationaryResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const result = previewResult(request, request.minFrame + offset);
        processedStates++;
        if (gen7StationaryResultPassesFilters(request, result))
          accepted.push(result);
        if (accepted.length >= resultLimit) break;
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached:
          accepted.length >= resultLimit && processedStates < totalStates,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
