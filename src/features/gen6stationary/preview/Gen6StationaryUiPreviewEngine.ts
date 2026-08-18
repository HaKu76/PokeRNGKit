import {
  gen6StationaryHiddenPower,
  gen6StationaryResultPassesFilters,
  gen6StationaryTaskCount,
  validateGen6StationaryRequest,
  type Gen6StationaryIvTuple,
  type Gen6StationaryRequest,
  type Gen6StationaryResult,
} from "../domain";
import type {
  Gen6StationaryEngine,
  Gen6StationarySearchOptions,
  Gen6StationarySummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}
function previewResult(
  request: Gen6StationaryRequest,
  frame: number,
): Gen6StationaryResult {
  const random = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const ec = mix(random ^ 0xa5a5a5a5);
  const pid = mix(ec ^ 0x31415926);
  const ivs = request.template.ivs.map((value, index) =>
    value >= 0 ? value : mix(random + index * 0x10203) >>> 27,
  ) as unknown as Gen6StationaryIvTuple;
  const nature =
    request.template.nature < 25
      ? request.template.nature
      : (request.template.alwaysSync || request.assumeSync) &&
          request.syncNature !== null
        ? request.syncNature
        : mix(pid) % 25;
  const gender =
    request.template.genderRatio === 255
      ? 0
      : request.template.genderRatio === 0
        ? 1
        : request.template.genderRatio === 254
          ? 2
          : mix(pid ^ random) % 252 >= request.template.genderRatio
            ? 1
            : 2;
  const ability = request.template.ability || (mix(pid ^ 0x55aa55aa) & 1) + 1;
  const xorValue = ((pid >>> 16) ^ (pid & 0xffff)) >>> 0;
  const psv = xorValue >>> 4;
  const prv = xorValue & 15;
  const tsv = request.template.otTsv ?? request.tsv;
  const shiny = psv === tsv ? (prv === request.trv ? 2 : 1) : 0;
  return {
    frame,
    random,
    ec,
    pid,
    ivs,
    nature,
    ability,
    gender,
    hiddenPower: gen6StationaryHiddenPower(ivs),
    shiny,
    synchronize: request.template.alwaysSync || request.assumeSync,
    delay: 0,
    frameUsed: request.template.alwaysSync ? 10 : 70,
    psv,
    prv,
  };
}

export class Gen6StationaryUiPreviewEngine implements Gen6StationaryEngine {
  private cancelled = false;
  async search(
    request: Gen6StationaryRequest,
    options: Gen6StationarySearchOptions = {},
  ): Promise<Gen6StationarySummary> {
    validateGen6StationaryRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6StationaryTaskCount(request), 5000);
    const accepted: Gen6StationaryResult[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    try {
      for (let index = 0; index < totalStates && !this.cancelled; index += 1) {
        const result = previewResult(request, request.minFrame + index);
        processedStates += 1;
        if (gen6StationaryResultPassesFilters(request, result))
          accepted.push(result);
        if (accepted.length >= request.resultLimit) break;
      }
      if (accepted.length) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached:
          accepted.length >= request.resultLimit &&
          processedStates < totalStates,
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
