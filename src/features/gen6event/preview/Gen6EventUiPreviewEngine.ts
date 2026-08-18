import {
  gen6EventHiddenPower,
  gen6EventResultPassesFilters,
  gen6EventTaskCount,
  validateGen6EventRequest,
  type Gen6EventIvTuple,
  type Gen6EventRequest,
  type Gen6EventResult,
} from "../domain";
import type {
  Gen6EventEngine,
  Gen6EventSearchOptions,
  Gen6EventSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(
  request: Gen6EventRequest,
  frame: number,
): Gen6EventResult {
  const random = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const ec = request.event.ec || mix(random ^ 0xa5a5a5a5);
  let pid =
    request.event.pidType === "specified"
      ? request.event.pid
      : mix(ec ^ 0x31415926);
  if (request.event.pidType === "shiny")
    pid = (pid & 0xffff) | ((request.tsv ^ request.trv) << 16);
  if (
    request.event.pidType === "nonshiny" &&
    ((pid >>> 16) ^ (pid & 0xffff)) >>> 4 === request.tsv
  )
    pid ^= 0x10000000;
  const ivs = request.event.fixedIvs.map((value, index) =>
    value >= 0 ? value : mix(random + index * 0x10203) >>> 27,
  ) as unknown as Gen6EventIvTuple;
  const ability = request.event.abilityLocked
    ? request.event.ability
    : (mix(pid ^ 0x55aa55aa) % (request.event.ability + 2)) + 1;
  const nature = request.event.natureLocked
    ? request.event.nature
    : mix(pid) % 25;
  const gender = request.event.genderLocked
    ? request.event.gender
    : request.event.gender === 0
      ? 1
      : 2;
  const xorValue = ((pid >>> 16) ^ (pid & 0xffff)) >>> 0;
  const psv = xorValue >>> 4;
  const prv = xorValue & 15;
  const shiny = psv === request.tsv ? 2 : 0;
  return {
    frame,
    random,
    ec,
    pid,
    ivs,
    nature,
    ability,
    gender,
    hiddenPower: gen6EventHiddenPower(ivs),
    shiny,
    delay: request.delay,
    frameUsed: request.considerDelay ? request.delay + 2 : 2,
    psv,
    prv,
  };
}

export class Gen6EventUiPreviewEngine implements Gen6EventEngine {
  private cancelled = false;

  async search(
    request: Gen6EventRequest,
    options: Gen6EventSearchOptions = {},
  ): Promise<Gen6EventSummary> {
    validateGen6EventRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6EventTaskCount(request), 5000);
    const accepted: Gen6EventResult[] = [];
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
        if (gen6EventResultPassesFilters(request, result))
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
        resultLimitReached: accepted.length >= request.resultLimit,
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
