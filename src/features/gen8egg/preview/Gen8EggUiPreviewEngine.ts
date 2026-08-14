import { getGen8EggBaseStats } from "../data";
import {
  gen8EggCharacteristic,
  gen8EggHiddenPower,
  gen8EggTaskCount,
  validateGen8EggRequest,
  validateGen8EggResult,
  type Gen8EggIvTuple,
  type Gen8EggRequest,
  type Gen8EggResult,
} from "../domain";
import type { Gen8EggEngine, Gen8EggSearchOptions } from "../search";

const ORDER = [0, 1, 2, 5, 3, 4] as const;
const NATURE_STAT_MAP = [1, 2, 5, 3, 4] as const;

function selectedBit(mask: number, count: number) {
  for (let index = 0; index < count; index += 1)
    if ((mask & (1 << index)) !== 0) return index;
  return 0;
}

function valueWithParity(minimum: number, maximum: number, parity: number) {
  const value = minimum + ((minimum & 1) === parity ? 0 : 1);
  return value <= maximum ? value : undefined;
}

function previewIvs(request: Gen8EggRequest) {
  if (request.filters.disabled)
    return [31, 12, 24, 8, 19, 30] as Gen8EggIvTuple;
  const targetType = selectedBit(request.filters.hiddenPowerMask, 16);
  for (let bits = 0; bits < 64; bits += 1) {
    if (Math.floor((bits * 15) / 63) !== targetType) continue;
    const ivs = [...request.filters.ivMin] as Gen8EggIvTuple;
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

function stats(
  species: number,
  ivs: Gen8EggIvTuple,
  nature: number,
): Gen8EggIvTuple {
  const base = getGen8EggBaseStats(species);
  const raised = NATURE_STAT_MAP[Math.floor(nature / 5)];
  const lowered = NATURE_STAT_MAP[nature % 5];
  return base.map((value, index) => {
    if (index === 0) return Math.floor((2 * value + ivs[index]) / 100) + 11;
    const raw = Math.floor((2 * value + ivs[index]) / 100) + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8EggIvTuple;
}

function previewPid(request: Gen8EggRequest, shiny: number) {
  const tsv = request.profile.tid ^ request.profile.sid;
  const psv = shiny === 2 ? tsv : shiny === 1 ? tsv ^ 1 : tsv ^ 0x10;
  return (psv << 16) >>> 0;
}

function previewResult(request: Gen8EggRequest): Gen8EggResult | undefined {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
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
  const ec = 0x1234_5678;
  const pid = previewPid(request, shiny);
  const power = gen8EggHiddenPower(ivs);
  const result: Gen8EggResult = {
    advances: request.initialAdvances,
    seed: "5A0F5EED",
    ec: ec.toString(16).toUpperCase().padStart(8, "0"),
    pid: pid.toString(16).toUpperCase().padStart(8, "0"),
    shiny,
    nature,
    ability,
    abilityIndex: ability + 1,
    ivs,
    stats: stats(request.species, ivs, nature),
    inheritance: [1, 0, 2, 0, 0, 2],
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender,
    characteristic: gen8EggCharacteristic(ec, ivs),
    species: request.species,
  };
  return validateGen8EggResult(request, result);
}

export class Gen8EggUiPreviewEngine implements Gen8EggEngine {
  private cancelled = false;

  async search(request: Gen8EggRequest, options: Gen8EggSearchOptions = {}) {
    validateGen8EggRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalStates = gen8EggTaskCount(request);
    const processedStates = cancelled ? 0 : totalStates;
    if (results.length !== 0) options.onBatch?.(results);
    options.onProgress?.({
      processedStates,
      totalStates,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
    });
    return {
      processedStates,
      totalStates,
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
