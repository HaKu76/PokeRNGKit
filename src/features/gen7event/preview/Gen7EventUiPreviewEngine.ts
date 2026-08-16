import {
  GEN7_EVENT_MAX_RESULTS,
  gen7EventEffectiveTsv,
  gen7EventHiddenPower,
  gen7EventPersonalForm,
  gen7EventResultPassesFilters,
  gen7EventTaskCount,
  validateGen7EventRequest,
  type Gen7EventIvTuple,
  type Gen7EventRequest,
  type Gen7EventResult,
} from "../domain";
import type {
  Gen7EventEngine,
  Gen7EventSearchOptions,
  Gen7EventSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(
  request: Gen7EventRequest,
  frame: number,
): Gen7EventResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const high = mix(low ^ 0xa5a5a5a5);
  const event = request.event;
  const tsv = gen7EventEffectiveTsv(request);
  let pid = event.pidType === "specified" ? event.pid : mix(high ^ 0x7f4a7c15);
  if (event.pidType === "shiny") {
    const lowPid = pid & 0xffff;
    pid = ((((tsv << 4) | request.trv) ^ lowPid) << 16) | lowPid;
  } else if (
    event.pidType === "nonshiny" &&
    ((pid >>> 16) ^ (pid & 0xffff)) >>> 4 === tsv
  ) {
    pid ^= 0x10000000;
  }
  const xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const ivs = event.fixedIvs.map((value, index) =>
    value >= 0 ? value : (mix(low + index * 0x10203) >>> 8) & 0x1f,
  ) as Gen7EventIvTuple;
  const openIvs = ivs
    .map((_, index) => index)
    .filter((index) => event.fixedIvs[index] < 0);
  for (
    let index = 0;
    index < event.randomPerfectIvCount && index < openIvs.length;
    index++
  ) {
    ivs[openIvs[(mix(high + index) >>> 8) % openIvs.length]] = 31;
  }
  const personal = gen7EventPersonalForm(event.species, event.form);
  const gender = event.genderLocked
    ? event.gender
    : personal.genderRatio === 0xff
      ? 0
      : personal.genderRatio === 0
        ? 1
        : personal.genderRatio === 0xfe
          ? 2
          : mix(pid ^ low) % 252 >= personal.genderRatio - 1
            ? 1
            : 2;
  const ability = event.abilityLocked
    ? event.ability
    : event.ability === 0
      ? (mix(pid ^ 0x55aa55aa) & 1) + 1
      : (mix(pid ^ 0x55aa55aa) % 3) + 1;
  const shiny = xorValue >>> 4 === tsv;
  const blink =
    request.npc === 0
      ? frame % 97 === 0
        ? 30
        : frame % 31 === 0
          ? 5
          : 0
      : frame % 43 === 0
        ? 3
        : frame % 17 === 0
          ? 1
          : 0;
  return {
    frame,
    realTimeFrames: (frame - request.minFrame) * 2,
    random: (BigInt(high) << 32n) | BigInt(low),
    ec: event.ec > 0 ? event.ec : mix(low ^ 0x31415926),
    pid,
    ivs,
    nature: event.natureLocked ? event.nature : mix(pid) % 25,
    ability,
    gender,
    hiddenPower: gen7EventHiddenPower(ivs),
    shiny: shiny ? ((xorValue & 0xf) === request.trv ? 2 : 1) : 0,
    blink,
    delay: request.considerDelay ? Math.trunc(request.delay / 2) + 2 : 0,
    psv: xorValue >>> 4,
    prv: xorValue & 0xf,
  };
}

export class Gen7EventUiPreviewEngine implements Gen7EventEngine {
  private cancelled = false;

  async search(
    request: Gen7EventRequest,
    options: Gen7EventSearchOptions = {},
  ): Promise<Gen7EventSummary> {
    validateGen7EventRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7EventTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults ?? GEN7_EVENT_MAX_RESULTS,
      ),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7EventResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const result = previewResult(request, request.minFrame + offset);
        processedStates++;
        if (gen7EventResultPassesFilters(request, result))
          accepted.push(result);
        if (accepted.length >= resultLimit) break;
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
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
