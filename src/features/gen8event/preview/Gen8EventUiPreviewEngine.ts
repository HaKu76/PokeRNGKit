import { getIvBaseStats } from "../../gen4ivcalculator/gen4IvData";
import {
  gen8EventCharacteristic,
  gen8EventHiddenPower,
  gen8EventTaskCount,
  gen8EventTsv,
  validateGen8EventRequest,
  validateGen8EventResult,
  type Gen8EventIvTuple,
  type Gen8EventRequest,
  type Gen8EventResult,
} from "../domain";
import type { Gen8EventEngine, Gen8EventSearchOptions } from "../search";

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

function previewIvs(request: Gen8EventRequest) {
  if (request.filters.disabled)
    return [31, 31, 31, 12, 19, 30] as Gen8EventIvTuple;
  const targetType = selectedBit(request.filters.hiddenPowerMask, 16);
  for (let bits = 0; bits < 64; bits += 1) {
    if (Math.floor((bits * 15) / 63) !== targetType) continue;
    const ivs = [...request.filters.ivMin] as Gen8EventIvTuple;
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
    if (!valid) continue;
    let perfect = ivs.filter((value) => value === 31).length;
    for (let index = 0; index < 6 && perfect < request.event.ivCount; index++) {
      if (
        (ivs[index] & 1) === 1 &&
        request.filters.ivMin[index] <= 31 &&
        request.filters.ivMax[index] >= 31 &&
        ivs[index] !== 31
      ) {
        ivs[index] = 31;
        perfect += 1;
      }
    }
    if (perfect >= request.event.ivCount) return ivs;
  }
  return undefined;
}

function stats(
  request: Gen8EventRequest,
  ivs: Gen8EventIvTuple,
  nature: number,
): Gen8EventIvTuple {
  const base = getIvBaseStats("bdsp", request.event.species);
  const raised = NATURE_STAT_MAP[Math.floor(nature / 5)];
  const lowered = NATURE_STAT_MAP[nature % 5];
  return base.map((value, index) => {
    const scaled = Math.floor(
      ((2 * value + ivs[index]) * request.event.level) / 100,
    );
    if (index === 0) return scaled + request.event.level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8EventIvTuple;
}

function shinyFromPid(request: Gen8EventRequest, pid: number) {
  const tsv = gen8EventTsv(request);
  const psv = (pid >>> 16) ^ (pid & 0xffff);
  if (tsv === psv) return 2;
  return (tsv ^ psv) < 16 ? 1 : 0;
}

function pidForShiny(request: Gen8EventRequest, shiny: number) {
  const tsv = gen8EventTsv(request);
  const low = 0x5678;
  const psv = shiny === 2 ? tsv : shiny === 1 ? tsv ^ 1 : tsv ^ 0x10;
  return ((((psv ^ low) & 0xffff) << 16) | low) >>> 0;
}

function selectedShiny(request: Gen8EventRequest) {
  const fixed =
    request.event.pidType === "nonshiny"
      ? 0
      : request.event.pidType === "star"
        ? 1
        : request.event.pidType === "square"
          ? 2
          : request.event.pidType === "static"
            ? shinyFromPid(request, request.event.pid)
            : undefined;
  const requested = request.filters.disabled
    ? undefined
    : request.filters.shiny === "star"
      ? 1
      : request.filters.shiny === "square"
        ? 2
        : request.filters.shiny === "starSquare"
          ? 1
          : undefined;
  if (fixed !== undefined && requested !== undefined && fixed !== requested)
    return undefined;
  return fixed ?? requested ?? 0;
}

function previewResult(request: Gen8EventRequest): Gen8EventResult | undefined {
  const ivs = previewIvs(request);
  const shiny = selectedShiny(request);
  if (!ivs || shiny === undefined) return undefined;
  const nature =
    request.event.nature ??
    (request.filters.disabled
      ? 0
      : selectedBit(request.filters.natureMask, 25));
  if (
    !request.filters.disabled &&
    (request.filters.natureMask & (1 << nature)) === 0
  )
    return undefined;
  const gender = request.event.gender;
  if (
    !request.filters.disabled &&
    request.filters.gender !== "any" &&
    !(
      (request.filters.gender === "male" && gender === 0) ||
      (request.filters.gender === "female" && gender === 1)
    )
  )
    return undefined;
  const allowedAbilities =
    request.event.ability <= 2
      ? [request.event.ability]
      : request.event.ability === 3
        ? [0, 1]
        : [0, 1, 2];
  const requestedAbility =
    request.filters.disabled || request.filters.ability === "any"
      ? allowedAbilities[0]
      : request.filters.ability === "first"
        ? 0
        : request.filters.ability === "second"
          ? 1
          : 2;
  if (!allowedAbilities.includes(requestedAbility)) return undefined;
  const height = request.filters.disabled ? 64 : request.filters.heightMin;
  const weight = request.filters.disabled ? 96 : request.filters.weightMin;
  const ec = request.event.ec || 0x1234_5678;
  const pid =
    request.event.pidType === "static"
      ? request.event.pid
      : pidForShiny(request, shiny);
  const power = gen8EventHiddenPower(ivs);
  const result: Gen8EventResult = {
    advances: request.initialAdvances,
    ec: ec.toString(16).toUpperCase().padStart(8, "0"),
    pid: pid.toString(16).toUpperCase().padStart(8, "0"),
    shiny,
    nature,
    ability: requestedAbility,
    abilityIndex: requestedAbility + 1,
    ivs,
    stats: stats(request, ivs, nature),
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender,
    height,
    weight,
    characteristic: gen8EventCharacteristic(ec, ivs),
  };
  return validateGen8EventResult(request, result);
}

export class Gen8EventUiPreviewEngine implements Gen8EventEngine {
  private cancelled = false;

  async search(
    request: Gen8EventRequest,
    options: Gen8EventSearchOptions = {},
  ) {
    validateGen8EventRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalStates = gen8EventTaskCount(request);
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
