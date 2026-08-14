import {
  gen5EventCharacteristic,
  gen5EventTaskCount,
  isGen5EventButtonMaskAllowed,
  validateGen5EventRequest,
  validateGen5EventResult,
  type Gen5EventIvTuple,
  type Gen5EventRequest,
  type Gen5EventResult,
} from "../domain";
import type {
  Gen5EventEngine,
  Gen5EventSearchOptions,
  Gen5EventSummary,
} from "../search";

function firstSelected(mask: number, count: number) {
  for (let index = 0; index < count; index += 1)
    if ((mask & (1 << index)) !== 0) return index;
  return 0;
}

function hiddenPower(ivs: Gen5EventIvTuple) {
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

function previewIvs(request: Gen5EventRequest) {
  const minimums = request.filters.disabled
    ? ([0, 0, 0, 0, 0, 0] as Gen5EventIvTuple)
    : request.filters.ivMin;
  const maximums = request.filters.disabled
    ? ([31, 31, 31, 31, 31, 31] as Gen5EventIvTuple)
    : request.filters.ivMax;
  for (let parityMask = 0; parityMask < 64; parityMask += 1) {
    const ivs = request.event.ivs.map((fixed, index) => {
      if (fixed !== null) return fixed;
      const parity = (parityMask >>> index) & 1;
      return minimums[index] + ((parity - minimums[index]) & 1);
    }) as Gen5EventIvTuple;
    if (
      ivs.some(
        (value, index) => value < minimums[index] || value > maximums[index],
      )
    )
      continue;
    const power = hiddenPower(ivs);
    if (
      request.filters.disabled ||
      (request.filters.hiddenPowerMask & (1 << power.type)) !== 0
    )
      return ivs;
  }
  return undefined;
}

function previewButton(request: Gen5EventRequest) {
  for (let mask = 0; mask < 0x1000; mask += 1)
    if (isGen5EventButtonMaskAllowed(request.profile, mask)) return mask;
  return undefined;
}

function previewResult(
  request: Gen5EventRequest,
  index: number,
): Gen5EventResult | undefined {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
  const nature =
    request.event.nature === 255
      ? request.filters.disabled
        ? index % 25
        : firstSelected(request.filters.natureMask, 25)
      : request.event.nature;
  const allowedAbilities =
    request.event.ability === 3 ? ([0, 1] as const) : [request.event.ability];
  const ability =
    request.filters.disabled || request.filters.ability === 255
      ? allowedAbilities[0]
      : allowedAbilities.find((value) => value === request.filters.ability);
  const gender =
    request.event.gender < 2
      ? request.event.gender
      : request.filters.disabled || request.filters.gender === 255
        ? 0
        : request.filters.gender;
  const shiny =
    request.event.shiny === 1
      ? 0
      : request.event.shiny === 2
        ? 2
        : request.filters.disabled || request.filters.shiny === 255
          ? 0
          : request.filters.shiny === 2
            ? 2
            : 1;
  if (
    ability === undefined ||
    (!request.filters.disabled &&
      ((request.filters.gender !== 255 && request.filters.gender !== gender) ||
        (request.filters.shiny !== 255 &&
          (request.filters.shiny & shiny) === 0) ||
        (request.filters.natureMask & (1 << nature)) === 0))
  )
    return undefined;
  const pidValue = (0x1234_5678 + index * 0x101) >>> 0;
  const power = hiddenPower(ivs);
  const result: Gen5EventResult = {
    seed:
      request.mode === "generator"
        ? request.seed.toUpperCase().padStart(16, "0")
        : (0x1234_5678_9abcn + BigInt(index))
            .toString(16)
            .toUpperCase()
            .padStart(16, "0"),
    advances: request.initialAdvances + 40 + index,
    chatot: (index * 17) % 100,
    needle: index % 8,
    pid: pidValue.toString(16).toUpperCase().padStart(8, "0"),
    shiny: shiny as 0 | 1 | 2,
    nature,
    ability: ability as 0 | 1 | 2,
    abilityIndex: ability + 1,
    ivs,
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender: gender as 0 | 1 | 2,
    characteristic: gen5EventCharacteristic(pidValue, ivs),
    level: request.event.level,
  };
  if (request.mode === "searcher") {
    result.dateTime = `${request.startDate} 00:00:${String(index).padStart(2, "0")}`;
    result.timer0 = request.profile.timer0Min;
    result.buttonMask = previewButton(request);
  }
  return validateGen5EventResult(request, result);
}

export class Gen5EventUiPreviewEngine implements Gen5EventEngine {
  private cancelled = false;

  async search(
    request: Gen5EventRequest,
    options: Gen5EventSearchOptions = {},
  ): Promise<Gen5EventSummary> {
    validateGen5EventRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalUnits = Number(gen5EventTaskCount(request));
    await Promise.resolve();
    if (this.cancelled || options.signal?.aborted)
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
    const count = Math.min(request.resultLimit, request.maxAdvances + 1, 8);
    const results = Array.from({ length: count }, (_, index) =>
      previewResult(request, index),
    ).filter((result): result is Gen5EventResult => result !== undefined);
    if (results.length !== 0) options.onBatch?.(results);
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
