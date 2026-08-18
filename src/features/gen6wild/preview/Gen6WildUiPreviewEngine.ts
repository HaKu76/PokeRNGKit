import {
  gen6WildHiddenPower,
  gen6WildResultPassesFilters,
  gen6WildTaskCount,
  validateGen6WildRequest,
  type Gen6WildIvTuple,
  type Gen6WildRequest,
  type Gen6WildResult,
} from "../domain";
import type {
  Gen6WildEngine,
  Gen6WildSearchOptions,
  Gen6WildSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(request: Gen6WildRequest, frame: number, slot = 1) {
  const random = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const ec = mix(random ^ 0xa5a5a5a5);
  const pid = mix(ec ^ 0x31415926);
  const ivs = [0, 1, 2, 3, 4, 5].map(
    (index) => (mix(random + index * 0x10203) >>> 27) & 31,
  ) as Gen6WildIvTuple;
  const slotData = request.slots[Math.max(0, slot - 1)] ?? request.slots[0];
  const ratio = slotData?.genderRatio ?? 255;
  const gender =
    ratio === 255
      ? 0
      : ratio === 0
        ? 1
        : ratio === 254
          ? 2
          : mix(pid ^ random) % 252 >= ratio
            ? 1
            : 2;
  const xorValue = ((pid >>> 16) ^ (pid & 0xffff)) >>> 0;
  const shiny =
    xorValue >>> 4 === request.tsv
      ? (xorValue & 15) === request.trv
        ? 2
        : 1
      : 0;
  return {
    frame,
    random,
    ec,
    pid,
    ivs,
    nature: request.syncNature ?? mix(pid) % 25,
    ability: request.hiddenAbility ? 3 : (mix(pid ^ 0x55aa55aa) & 1) + 1,
    gender,
    hiddenPower: gen6WildHiddenPower(ivs),
    shiny,
    synchronize:
      request.tinySynced || (request.lead === "synchronize" && frame % 2 === 0),
    species: slotData?.species ?? 0,
    level: slotData?.level ?? 1,
    slot,
    item: random % 100 < 50 ? 0 : random % 100 < 55 ? 1 : 3,
    frameUsed: request.considerDelay ? request.delay + 60 : 60,
    psv: xorValue >>> 4,
    prv: xorValue & 15,
  } satisfies Gen6WildResult;
}

export class Gen6WildUiPreviewEngine implements Gen6WildEngine {
  private cancelled = false;

  async search(
    request: Gen6WildRequest,
    options: Gen6WildSearchOptions = {},
  ): Promise<Gen6WildSummary> {
    validateGen6WildRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6WildTaskCount(request), 5_000);
    const accepted: Gen6WildResult[] = [];
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    let processedStates = 0;
    try {
      for (let index = 0; index < totalStates && !this.cancelled; index += 1) {
        const frame = request.minFrame + index;
        const count = request.encounterType === "horde" ? 5 : 1;
        for (let slot = 1; slot <= count; slot += 1) {
          const result = previewResult(request, frame, slot);
          if (gen6WildResultPassesFilters(request, result))
            accepted.push(result);
          if (accepted.length >= request.resultLimit) break;
        }
        processedStates += 1;
        if (accepted.length >= request.resultLimit) break;
      }
      if (accepted.length > 0) options.onBatch?.(accepted);
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
