import {
  GEN5_DREAM_RADAR_ABILITIES,
  GEN5_DREAM_RADAR_ENCOUNTERS,
  gen5DreamRadarCharacteristic,
  gen5DreamRadarTaskCount,
  validateGen5DreamRadarRequest,
  type Gen5DreamRadarIvTuple,
  type Gen5DreamRadarRequest,
  type Gen5DreamRadarResult,
} from "../domain";
import type { Gen5DreamRadarEngine, Gen5DreamRadarOptions } from "../search";

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

function previewIvs(request: Gen5DreamRadarRequest) {
  const targetType = selectedBit(request.filters.hiddenPowerMask, 16);
  for (let bits = 0; bits < 64; bits += 1) {
    if (Math.floor((bits * 15) / 63) !== targetType) continue;
    const ivs = [...request.filters.ivMin] as Gen5DreamRadarIvTuple;
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

function hiddenPower(ivs: Gen5DreamRadarIvTuple) {
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

function previewResult(
  request: Gen5DreamRadarRequest,
): Gen5DreamRadarResult | undefined {
  const ivs = request.filters.disabled
    ? ([31, 12, 24, 8, 19, 30] as Gen5DreamRadarIvTuple)
    : previewIvs(request);
  if (!ivs) return undefined;
  const targetIndex = request.slots.at(-1)!.encounter;
  const target = GEN5_DREAM_RADAR_ENCOUNTERS[targetIndex];
  const selectedGender = request.slots.at(-1)!.gender;
  const pid = 0x64b21ef2;
  const ability = target.ability === 255 ? (pid >> 16) & 1 : 2;
  const power = hiddenPower(ivs);
  return {
    seed:
      request.mode === "generator"
        ? request.seed.toUpperCase().padStart(16, "0")
        : "5A0F5EED12345678",
    advances: request.initialAdvances,
    needle: 4,
    pid: pid.toString(16).toUpperCase().padStart(8, "0"),
    ability,
    abilityIndex: GEN5_DREAM_RADAR_ABILITIES[targetIndex][ability],
    ivs,
    level: [5, 10, 10, 20, 20, 30, 30, 40, 40][request.badges],
    nature: request.filters.disabled
      ? 1
      : selectedBit(request.filters.natureMask, 25),
    gender: target.legend && !target.genie ? 2 : selectedGender,
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    characteristic: gen5DreamRadarCharacteristic(pid, ivs),
    dateTime:
      request.mode === "searcher" ? `${request.startDate} 00:00:00` : undefined,
    timer0: request.mode === "searcher" ? request.profile.timer0Min : undefined,
    buttonMask: request.mode === "searcher" ? 0 : undefined,
  };
}

export class Gen5DreamRadarUiPreviewEngine implements Gen5DreamRadarEngine {
  private cancelled = false;

  async search(
    request: Gen5DreamRadarRequest,
    options: Gen5DreamRadarOptions = {},
  ) {
    validateGen5DreamRadarRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalUnits = Number(gen5DreamRadarTaskCount(request));
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
