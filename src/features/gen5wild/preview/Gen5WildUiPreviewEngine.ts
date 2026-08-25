import { getIvBaseStats } from "../../gen4ivcalculator/gen4IvData";
import {
  gen5WildCharacteristic,
  gen5WildTaskCount,
  isGen5WildButtonMaskAllowed,
  validateGen5WildRequest,
  validateGen5WildResult,
  type Gen5WildIvTuple,
  type Gen5WildRequest,
  type Gen5WildResult,
} from "../domain";
import { passesPerfectIvFilter } from "../../shared/perfectIvFilter";
import type {
  Gen5WildEngine,
  Gen5WildOptions,
  Gen5WildSummary,
} from "../search";

function firstSelected(mask: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    if ((mask & (1 << index)) !== 0) return index;
  }
  return 0;
}

function hiddenPower(ivs: Gen5WildIvTuple) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  let typeBits = 0;
  let powerBits = 0;
  order.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >>> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    power: 30 + Math.floor((powerBits * 40) / 63),
  };
}

function previewIvs(request: Gen5WildRequest) {
  if (request.filters.disabled)
    return [31, 30, 29, 28, 27, 26] as Gen5WildIvTuple;
  for (let parityMask = 0; parityMask < 64; parityMask += 1) {
    const values: number[] = [];
    let possible = true;
    for (let index = 0; index < 6; index += 1) {
      const minimum = request.filters.ivMin[index];
      const parity = (parityMask >>> index) & 1;
      const value = minimum + ((parity - minimum) & 1);
      if (value > request.filters.ivMax[index]) {
        possible = false;
        break;
      }
      values.push(value);
    }
    if (!possible) continue;
    const ivs = values as Gen5WildIvTuple;
    if (
      (request.filters.hiddenPowerMask & (1 << hiddenPower(ivs).type)) !== 0 &&
      passesPerfectIvFilter(
        ivs,
        request.filters.perfectIvValue,
        request.filters.perfectIvCount,
      )
    )
      return ivs;
  }
  return undefined;
}

function firstButton(request: Gen5WildRequest) {
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5WildButtonMaskAllowed(request.profile, mask)) return mask;
  }
  return 0;
}

function computeStats(
  request: Gen5WildRequest,
  slot: number,
  ivs: Gen5WildIvTuple,
  nature: number,
  level: number,
) {
  const encounter = request.area.slots[slot];
  const base = getIvBaseStats("bw2", encounter.species, encounter.form);
  const natureBoost = Math.floor(nature / 5);
  const natureDrop = nature % 5;
  const statMap = [1, 2, 5, 3, 4];
  return base.map((value, index) => {
    if (index === 0)
      return Math.floor(((2 * value + ivs[index]) * level) / 100) + level + 10;
    const raw = Math.floor(((2 * value + ivs[index]) * level) / 100) + 5;
    const neutral = natureBoost === natureDrop;
    const modifier = neutral
      ? 100
      : statMap[natureBoost] === index
        ? 110
        : statMap[natureDrop] === index
          ? 90
          : 100;
    return Math.floor((raw * modifier) / 100);
  }) as Gen5WildIvTuple;
}

function previewResult(
  request: Gen5WildRequest,
  index: number,
): Gen5WildResult | undefined {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
  const slot = firstSelected(
    request.filters.slotMask,
    request.area.slots.length,
  );
  const encounter = request.area.slots[slot];
  const minimum = request.filters.disabled ? 1 : request.filters.levelMin;
  const maximum = request.filters.disabled ? 100 : request.filters.levelMax;
  const level = Math.max(encounter.minLevel, minimum);
  if (level > Math.min(encounter.maxLevel, maximum)) return undefined;
  const nature = request.filters.disabled
    ? index % 25
    : firstSelected(request.filters.natureMask, 25);
  const power = hiddenPower(ivs);
  const pidValue = (0x1234_0000 + index * 0x101 + nature) >>> 0;
  const pid = pidValue.toString(16).toUpperCase().padStart(8, "0");
  const ability = request.filters.disabled
    ? 0
    : request.filters.ability === 255
      ? 0
      : request.filters.ability;
  const gender = request.filters.disabled
    ? 0
    : request.filters.gender === 255
      ? 0
      : request.filters.gender;
  const shiny = request.filters.disabled
    ? 0
    : request.filters.shiny === 255
      ? 0
      : request.filters.shiny === 3
        ? 1
        : request.filters.shiny;
  const result: Gen5WildResult = {
    seed:
      request.mode === "generator"
        ? request.seed.toUpperCase().padStart(16, "0")
        : (0x1234_5678_9abcn + BigInt(index))
            .toString(16)
            .toUpperCase()
            .padStart(16, "0"),
    advances: request.initialAdvances + index,
    ivAdvances: request.initialIvAdvances,
    chatot: (index * 17) % 100,
    needle: index % 8,
    item: 0,
    slot,
    level,
    species: encounter.species,
    form: encounter.form,
    pid,
    shiny: shiny as 0 | 1 | 2,
    nature,
    ability: ability as 0 | 1,
    abilityIndex: 1,
    ivs,
    stats: computeStats(request, slot, ivs, nature, level),
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender: gender as 0 | 1,
    characteristic: gen5WildCharacteristic(pidValue, ivs),
  };
  if (request.mode === "searcher") {
    result.dateTime = `${request.startDate} 00:00:${String(index).padStart(2, "0")}`;
    result.timer0 = request.profile.timer0Min;
    result.buttonMask = firstButton(request);
  }
  return validateGen5WildResult(request, result);
}

export class Gen5WildUiPreviewEngine implements Gen5WildEngine {
  private cancelled = false;

  async search(
    request: Gen5WildRequest,
    options: Gen5WildOptions = {},
  ): Promise<Gen5WildSummary> {
    validateGen5WildRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalUnits = Number(gen5WildTaskCount(request));
    const maximumResults = options.maxResults ?? request.resultLimit;
    if (!Number.isFinite(maximumResults) && maximumResults !== Infinity)
      throw new TypeError("Max results must be a finite number.");
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, Math.floor(maximumResults)),
    );
    await Promise.resolve();
    if (this.cancelled || options.signal?.aborted) {
      return {
        processedUnits: 0,
        totalUnits,
        resultCount: 0,
        percent: 0,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: true,
        resultLimitReached: false,
      };
    }
    const count = Math.min(resultLimit, request.maxAdvances + 1, 8);
    const results = Array.from({ length: count }, (_, index) =>
      previewResult(request, index),
    ).filter((result): result is Gen5WildResult => result !== undefined);
    options.onBatch?.(results);
    options.onProgress?.({
      processedUnits: totalUnits,
      totalUnits,
      resultCount: results.length,
      percent: 100,
    });
    return {
      processedUnits: totalUnits,
      totalUnits,
      resultCount: results.length,
      percent: 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: false,
      resultLimitReached: count >= resultLimit,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
