import { getGen5EggAlternateSpecies, getGen5EggBaseStats } from "../data";
import { passesPerfectIvFilter } from "../../shared/perfectIvFilter";
import {
  gen5EggCharacteristic,
  gen5EggTaskCount,
  isGen5EggButtonMaskAllowed,
  normalizeGen5EggSeed,
  validateGen5EggRequest,
  validateGen5EggResult,
  type Gen5EggIvTuple,
  type Gen5EggRequest,
  type Gen5EggResult,
} from "../domain";
import type { Gen5EggEngine, Gen5EggSearchOptions } from "../search";

const ORDER = [0, 1, 2, 5, 3, 4] as const;

function selectedBit(mask: number, count: number) {
  for (let index = 0; index < count; index += 1)
    if ((mask & (1 << index)) !== 0) return index;
  return 0;
}

function valueWithParity(minimum: number, maximum: number, parity: number) {
  const value = minimum + ((minimum & 1) === parity ? 0 : 1);
  return value <= maximum ? value : undefined;
}

function previewIvs(request: Gen5EggRequest) {
  if (request.filters.disabled)
    return [31, 12, 24, 8, 19, 30] as Gen5EggIvTuple;
  const targetType = selectedBit(request.filters.hiddenPowerMask, 16);
  for (let bits = 0; bits < 64; bits += 1) {
    if (Math.floor((bits * 15) / 63) !== targetType) continue;
    const ivs = [...request.filters.ivMin] as Gen5EggIvTuple;
    let valid = true;
    ORDER.forEach((ivIndex, bit) => {
      const value = valueWithParity(
        request.filters.ivMin[ivIndex],
        request.filters.ivMax[ivIndex],
        (bits >> bit) & 1,
      );
      if (value === undefined) valid = false;
      else ivs[ivIndex] = value;
    });
    if (valid) return ivs;
  }
  return undefined;
}

function hiddenPower(ivs: Gen5EggIvTuple) {
  let typeBits = 0;
  let powerBits = 0;
  ORDER.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    strength: 30 + Math.floor((powerBits * 40) / 63),
  };
}

function previewButtonMask(request: Gen5EggRequest) {
  if (request.mode !== "searcher") return undefined;
  for (let mask = 0; mask < 0x1000; mask += 1)
    if (isGen5EggButtonMaskAllowed(request.profile, mask)) return mask;
  return undefined;
}

function stats(
  species: number,
  ivs: Gen5EggIvTuple,
  nature: number,
): Gen5EggIvTuple {
  const base = getGen5EggBaseStats(species);
  const statMap = [1, 2, 5, 3, 4];
  const raised = statMap[Math.floor(nature / 5)];
  const lowered = statMap[nature % 5];
  return base.map((value, index) => {
    if (index === 0) return Math.floor((2 * value + ivs[index]) / 100) + 11;
    const raw = Math.floor((2 * value + ivs[index]) / 100) + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen5EggIvTuple;
}

function previewResult(request: Gen5EggRequest): Gen5EggResult | undefined {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
  if (
    !request.filters.disabled &&
    !passesPerfectIvFilter(
      ivs,
      request.filters.perfectIvValue,
      request.filters.perfectIvCount,
    )
  )
    return undefined;
  const buttonMask = previewButtonMask(request);
  if (request.mode === "searcher" && buttonMask === undefined) return undefined;
  const species =
    getGen5EggAlternateSpecies(request.species) ?? request.species;
  const nature = request.filters.disabled
    ? 0
    : selectedBit(request.filters.natureMask, 25);
  const ability =
    request.filters.disabled || request.filters.ability === "any"
      ? 0
      : request.filters.ability === "first"
        ? 0
        : request.filters.ability === "second"
          ? 1
          : 2;
  const gender =
    request.filters.disabled || request.filters.gender === "any"
      ? 0
      : request.filters.gender === "male"
        ? 0
        : request.filters.gender === "female"
          ? 1
          : 2;
  const shiny =
    request.filters.disabled ||
    request.filters.shiny === "any" ||
    request.filters.shiny === "notShiny"
      ? 0
      : request.filters.shiny === "square"
        ? 2
        : 1;
  const pid = 0x1234_5678;
  const power = hiddenPower(ivs);
  const result: Gen5EggResult = {
    seed:
      request.mode === "generator"
        ? normalizeGen5EggSeed(request.seed)
        : "5A0F5EED12345678",
    advances: request.initialAdvances,
    chatot: 50,
    needle: 4,
    pid: pid.toString(16).toUpperCase().padStart(8, "0"),
    shiny,
    nature,
    ability,
    abilityIndex: ability + 1,
    ivs,
    stats: stats(species, ivs, nature),
    inheritance: [1, 0, 2, 0, 0, 2],
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    gender,
    characteristic: gen5EggCharacteristic(
      request.profile.version === "black2" ||
        request.profile.version === "white2"
        ? 0
        : pid,
      ivs,
    ),
    species,
    dateTime:
      request.mode === "searcher" ? `${request.startDate} 00:00:00` : undefined,
    timer0: request.mode === "searcher" ? request.profile.timer0Min : undefined,
    buttonMask,
  };
  return validateGen5EggResult(request, result);
}

export class Gen5EggUiPreviewEngine implements Gen5EggEngine {
  private cancelled = false;

  async search(request: Gen5EggRequest, options: Gen5EggSearchOptions = {}) {
    validateGen5EggRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalUnits = Number(gen5EggTaskCount(request));
    const processedUnits = cancelled ? 0 : totalUnits;
    if (results.length !== 0) options.onBatch?.(results);
    options.onProgress?.({
      processedUnits,
      totalUnits,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
    });
    return {
      processedUnits,
      totalUnits,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
      elapsedMs: 0,
      workerCount: 1,
      cancelled,
      resultLimitReached: false,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
