import {
  GEN7_SOS_MAX_RESULTS,
  gen7SosCallRates,
  gen7SosHiddenPower,
  gen7SosResultPassesFilters,
  gen7SosTaskCount,
  validateGen7SosRequest,
  type Gen7SosCallRequest,
  type Gen7SosCallResult,
  type Gen7SosIvTuple,
  type Gen7SosPokemonRequest,
  type Gen7SosPokemonResult,
  type Gen7SosRequest,
  type Gen7SosResult,
} from "../domain";
import type {
  Gen7SosEngine,
  Gen7SosSearchOptions,
  Gen7SosSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function regularSlot(random: number) {
  const chances = [1, 1, 1, 10, 10, 10, 67];
  let value = random % 100;
  for (let index = 0; index < chances.length; index++) {
    value -= chances[index];
    if (value < 0) return index + 1;
  }
  return 7;
}

function callSlot(weather: boolean, random: number) {
  const value = random % 100;
  if (weather && value === 0) return 8;
  if (weather && value <= 10) return 9;
  return regularSlot(mix(random ^ 0xa5a5_a5a5));
}

function flawlessCount(chainLength: number) {
  return chainLength > 10
    ? Math.min(4, Math.trunc(chainLength / 10) + 1)
    : Math.trunc(chainLength / 5);
}

function hiddenAbilityRate(chainLength: number) {
  return Math.min(15, Math.trunc(chainLength / 10) * 5);
}

function bitCount(value: number) {
  let count = 0;
  for (let bits = value >>> 0; bits !== 0; bits >>>= 1) count += bits & 1;
  return count;
}

function bumpPerfectMask(mask: number, chainLength: number, random: number) {
  let result = mask & 0x3f;
  let cursor = 0;
  while (bitCount(result) < flawlessCount(chainLength)) {
    result |= 1 << (mix(random + cursor++ * 0x10203) % 6);
  }
  return result;
}

function callPreview(
  request: Gen7SosCallRequest,
  frame: number,
): Gen7SosCallResult {
  const random = mix(request.seed ^ Math.imul(frame, 0x9e37_79b9));
  const call1 = mix(random ^ request.delay) % 100;
  const call2 = mix(random ^ request.delay ^ 0x3141_5926) % 100;
  const { rate1, rate2 } = gen7SosCallRates(request.callConditions);
  const slot = callSlot(request.weather, mix(random ^ 0x55aa_55aa));
  const level =
    request.levelMin +
    (mix(random ^ 0x7f4a_7c15) % (request.levelMax - request.levelMin + 1));
  const itemRoll = mix(random ^ 0x2718_2818) % 100;
  const bumpedIvMask = bumpPerfectMask(
    request.existingPerfectIvMask,
    request.chainLength,
    random,
  );
  const success = call1 < rate1 && call2 < rate2;
  return {
    mode: "calls",
    frame,
    random,
    call1,
    call2,
    rate1,
    rate2,
    success,
    synchronize: mix(random ^ 0x1122_3344) % 100 >= 50,
    slot,
    level,
    item: itemRoll < 50 ? 0 : itemRoll < 55 ? 1 : 3,
    bumpedIvMask,
    hiddenAbility:
      mix(random ^ 0x8877_6655) % 100 < hiddenAbilityRate(request.chainLength),
    advance: success ? request.delay + 9 : call1 >= rate1 ? 1 : 2,
  };
}

function pokemonPreview(
  request: Gen7SosPokemonRequest,
  frame: number,
): Gen7SosPokemonResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e37_79b9));
  const high = mix(low ^ request.sosSeed ^ request.sosFrame);
  const { rate1, rate2 } = gen7SosCallRates(request.callConditions);
  const call1 = mix(high ^ 0x1111_1111) % 100;
  const call2 = mix(high ^ 0x2222_2222) % 100;
  const weather =
    request.weather !== "none" &&
    (request.slots[7].species !== 0 || request.slots[8].species !== 0);
  let slot = callSlot(weather, mix(high ^ 0x3333_3333));
  if (request.slots[slot - 1].species === 0) slot = regularSlot(high);
  const slotData = request.slots[slot - 1];
  const ivs = [0, 1, 2, 3, 4, 5].map(
    (index) => (mix(low + index * 0x10203) >>> 8) & 0x1f,
  ) as Gen7SosIvTuple;
  let perfectIvMask = ivs.reduce(
    (mask, iv, index) => mask | (iv === 31 ? 1 << index : 0),
    0,
  );
  perfectIvMask = bumpPerfectMask(perfectIvMask, request.chainLength, high);
  ivs.forEach((_, index) => {
    if ((perfectIvMask & (1 << index)) !== 0) ivs[index] = 31;
  });
  let pid = mix(high ^ 0x7f4a_7c15);
  if (frame % 127 === 0) {
    const pidLow = pid & 0xffff;
    pid = ((((request.tsv << 4) + request.trv) ^ pidLow) << 16) | pidLow;
  }
  const xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const shiny = xorValue >>> 4 === request.tsv;
  const synchronize =
    request.lead === "synchronize" && mix(high ^ 0x4444_4444) % 100 >= 50;
  const hiddenAbility =
    mix(high ^ 0x5555_5555) % 100 < hiddenAbilityRate(request.chainLength);
  const itemRoll = mix(high ^ 0x6666_6666) % 100;
  return {
    mode: "pokemon",
    frame,
    realTimeFrames: (frame - request.minFrame) * 2,
    random: (BigInt(high) << 32n) | BigInt(low),
    ec: mix(low ^ 0x3141_5926),
    pid,
    ivs,
    nature:
      synchronize && request.syncNature !== null
        ? request.syncNature
        : mix(pid) % 25,
    ability: hiddenAbility ? 3 : (mix(pid ^ 0x55aa_55aa) & 1) + 1,
    gender: slotData.randomGender ? (mix(pid ^ low) & 1) + 1 : slotData.gender,
    hiddenPower: gen7SosHiddenPower(ivs),
    shiny: shiny ? ((xorValue & 0xf) === request.trv ? 2 : 1) : 0,
    synchronize,
    blink:
      request.npc === 0 ? (frame % 31 === 0 ? 5 : 0) : frame % 17 === 0 ? 2 : 0,
    delay: request.considerDelay ? Math.trunc(request.delayTime / 2) + 2 : 0,
    species: slotData.species,
    form: slotData.form,
    level:
      request.levelMin +
      (mix(high ^ 0x7777_7777) % (request.levelMax - request.levelMin + 1)),
    slot,
    item: itemRoll < 50 ? 0 : itemRoll < 55 ? 1 : 3,
    call1,
    call2,
    rate1,
    rate2,
    callSuccess: call1 < rate1 && call2 < rate2,
    bumpedIvMask: perfectIvMask,
    battleAdvance: 9 + flawlessCount(request.chainLength),
    psv: xorValue >>> 4,
    prv: xorValue & 0xf,
  };
}

function previewResult(request: Gen7SosRequest, frame: number): Gen7SosResult {
  return request.mode === "pokemon"
    ? pokemonPreview(request, frame)
    : callPreview(request, frame);
}

export class Gen7SosUiPreviewEngine implements Gen7SosEngine {
  private cancelled = false;

  async search(
    request: Gen7SosRequest,
    options: Gen7SosSearchOptions = {},
  ): Promise<Gen7SosSummary> {
    validateGen7SosRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7SosTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, options.maxResults ?? GEN7_SOS_MAX_RESULTS),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7SosResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const result = previewResult(request, request.minFrame + offset);
        processedStates++;
        if (gen7SosResultPassesFilters(request, result)) accepted.push(result);
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
