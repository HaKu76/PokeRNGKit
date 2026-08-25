import {
  gen5StaticCharacteristic,
  gen5StaticTaskCount,
  isGen5StaticButtonMaskAllowed,
  validateGen5StaticRequest,
  validateGen5StaticResult,
  type Gen5StaticIvTuple,
  type Gen5StaticRequest,
  type Gen5StaticResult,
} from "../domain";
import { passesPerfectIvFilter } from "../../shared/perfectIvFilter";
import type {
  Gen5StaticEngine,
  Gen5StaticOptions,
  Gen5StaticSummary,
} from "../search";

function firstSelected(mask: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    if ((mask & (1 << index)) !== 0) return index;
  }
  return 0;
}

function hiddenPower(ivs: Gen5StaticIvTuple) {
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

function firstButton(request: Gen5StaticRequest) {
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5StaticButtonMaskAllowed(request.profile, mask)) return mask;
  }
  return 0;
}

function previewIvs(request: Gen5StaticRequest) {
  if (request.filters.disabled)
    return [31, 30, 29, 28, 27, 26] as Gen5StaticIvTuple;
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
    const ivs = values as Gen5StaticIvTuple;
    const power = hiddenPower(ivs);
    if (
      (request.filters.hiddenPowerMask & (1 << power.type)) !== 0 &&
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

function allowedGenders(request: Gen5StaticRequest) {
  if (request.template.gender !== 255) return [request.template.gender];
  if (request.template.personal.gender === 255) return [2];
  if (request.template.personal.gender === 254) return [1];
  if (request.template.personal.gender === 0) return [0];
  return [0, 1];
}

function previewResult(
  request: Gen5StaticRequest,
  index: number,
): Gen5StaticResult | undefined {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
  const nature = request.filters.disabled
    ? index % 25
    : firstSelected(request.filters.natureMask, 25);
  const power = hiddenPower(ivs);
  const pidValue = (0x1234_0000 + index * 0x101 + nature) >>> 0;
  const pid = pidValue.toString(16).toUpperCase().padStart(8, "0");
  const abilities =
    request.template.ability === 255 ? [0, 1] : [request.template.ability];
  const abilityFilter = request.filters.disabled
    ? 255
    : request.filters.ability;
  const ability =
    abilityFilter === 255
      ? abilities[0]
      : abilities.includes(abilityFilter)
        ? abilityFilter
        : undefined;
  const genders = allowedGenders(request);
  const genderFilter = request.filters.disabled ? 255 : request.filters.gender;
  const gender =
    genderFilter === 255
      ? genders[0]
      : genders.includes(genderFilter)
        ? genderFilter
        : undefined;
  const shinies =
    request.template.shiny === "never"
      ? [0]
      : request.template.shiny === "always"
        ? [1]
        : [0, 1, 2];
  const shinyFilter = request.filters.disabled ? 255 : request.filters.shiny;
  const shiny =
    shinyFilter === 255
      ? shinies[0]
      : shinies.find((value) => (shinyFilter & value) !== 0);
  if (ability === undefined || gender === undefined || shiny === undefined)
    return undefined;
  const result: Gen5StaticResult = {
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
    pid,
    shiny: shiny as 0 | 1 | 2,
    nature,
    ability: ability as 0 | 1 | 2,
    abilityIndex:
      request.template.personal.abilities[ability] ||
      request.template.personal.abilities[0],
    ivs,
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender: gender as 0 | 1 | 2,
    characteristic: gen5StaticCharacteristic(pidValue, ivs),
  };
  if (request.mode === "searcher") {
    result.dateTime = `${request.startDate} 00:00:${String(index).padStart(2, "0")}`;
    result.timer0 = request.profile.timer0Min;
    result.buttonMask = firstButton(request);
  }
  return validateGen5StaticResult(request, result);
}

export class Gen5StaticUiPreviewEngine implements Gen5StaticEngine {
  private cancelled = false;

  async search(
    request: Gen5StaticRequest,
    options: Gen5StaticOptions = {},
  ): Promise<Gen5StaticSummary> {
    validateGen5StaticRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalUnits = Number(gen5StaticTaskCount(request));
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
    const count = Math.min(request.resultLimit, request.maxAdvances + 1, 8);
    const results = Array.from({ length: count }, (_, index) =>
      previewResult(request, index),
    ).filter((result): result is Gen5StaticResult => result !== undefined);
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
      resultLimitReached: count >= request.resultLimit,
    };
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }
}
