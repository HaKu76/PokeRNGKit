import {
  GEN7_WILD_MAX_RESULTS,
  gen7WildHiddenPower,
  gen7WildResultPassesFilters,
  gen7WildSlotChances,
  gen7WildTaskCount,
  validateGen7WildRequest,
  type Gen7WildIvTuple,
  type Gen7WildRequest,
  type Gen7WildResult,
} from "../domain";
import type {
  Gen7WildEngine,
  Gen7WildSearchOptions,
  Gen7WildSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function chooseSlot(request: Gen7WildRequest, random: number) {
  const chances = gen7WildSlotChances(request.encounter);
  let value = random % 100;
  for (let index = 0; index < chances.length; index++) {
    value -= chances[index];
    if (value < 0) return index + 1;
  }
  return Math.max(1, chances.length);
}

function previewResult(
  request: Gen7WildRequest,
  frame: number,
): Gen7WildResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e37_79b9));
  const high = mix(low ^ 0xa5a5_a5a5);
  const special =
    request.encounter.specialRate > 0 &&
    low % 100 < request.encounter.specialRate;
  const slot =
    special && request.encounter.category !== "fishing"
      ? 0
      : chooseSlot(request, high);
  const slotData =
    request.encounter.slots[Math.max(0, slot - 1)] ??
    request.encounter.slots[0];
  const ivs = [0, 1, 2, 3, 4, 5].map(
    (index) => (mix(low + index * 0x10203) >>> 8) & 0x1f,
  ) as Gen7WildIvTuple;
  let pid = mix(high ^ 0x7f4a_7c15);
  const forceShiny = frame % 127 === 0;
  if (forceShiny) {
    const pidLow = pid & 0xffff;
    pid = ((((request.tsv << 4) + request.trv) ^ pidLow) << 16) | pidLow;
  }
  const xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const shiny = xorValue >>> 4 === request.tsv;
  return {
    frame,
    realTimeFrames: (frame - request.minFrame) * 2,
    random: (BigInt(high) << 32n) | BigInt(low),
    ec: mix(low ^ 0x3141_5926),
    pid,
    ivs,
    nature: request.syncNature ?? mix(pid) % 25,
    ability: (mix(pid ^ 0x55aa_55aa) & 1) + 1,
    gender: slotData.randomGender ? (mix(pid ^ low) & 1) + 1 : slotData.gender,
    hiddenPower: gen7WildHiddenPower(ivs),
    shiny: shiny ? ((xorValue & 0xf) === request.trv ? 2 : 1) : 0,
    synchronize: request.lead === "synchronize" && frame % 2 === 0,
    blink:
      request.encounter.npc === 0
        ? frame % 31 === 0
          ? 5
          : 0
        : frame % 17 === 0
          ? 2
          : 0,
    delay: request.considerDelay ? request.encounter.delayTime : 0,
    species: slotData.species,
    form: slotData.form,
    level:
      special && request.encounter.specialLevel > 0
        ? request.encounter.specialLevel
        : request.encounter.levelMin +
          (low % (request.encounter.levelMax - request.encounter.levelMin + 1)),
    slot,
    item: high % 100 < 50 ? 0 : high % 100 < 55 ? 1 : 3,
    special,
    specialValue: special ? high % 100 : null,
    psv: xorValue >>> 4,
    prv: xorValue & 0xf,
  };
}

export class Gen7WildUiPreviewEngine implements Gen7WildEngine {
  private cancelled = false;

  async search(
    request: Gen7WildRequest,
    options: Gen7WildSearchOptions = {},
  ): Promise<Gen7WildSummary> {
    validateGen7WildRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7WildTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults ?? GEN7_WILD_MAX_RESULTS,
      ),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7WildResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const result = previewResult(request, request.minFrame + offset);
        processedStates++;
        if (gen7WildResultPassesFilters(request, result)) accepted.push(result);
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
