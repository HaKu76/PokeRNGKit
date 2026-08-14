import { getIvBaseStats } from "../../gen4ivcalculator/gen4IvData";
import {
  gen5HiddenGrottoCharacteristic,
  gen5HiddenGrottoTaskCount,
  isGen5HiddenGrottoButtonMaskAllowed,
  isGen5HiddenGrottoSearcher,
  validateGen5HiddenGrottoRequest,
  validateGen5HiddenGrottoResult,
  type Gen5HiddenGrottoIvTuple,
  type Gen5HiddenGrottoRequest,
  type Gen5HiddenGrottoResult,
} from "../domain";
import type {
  Gen5HiddenGrottoEngine,
  Gen5HiddenGrottoOptions,
  Gen5HiddenGrottoSummary,
} from "../search";

function firstSelected(mask: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    if ((mask & (1 << index)) !== 0) return index;
  }
  return 0;
}

function firstButton(request: Gen5HiddenGrottoRequest) {
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5HiddenGrottoButtonMaskAllowed(request.profile, mask)) return mask;
  }
  return 0;
}

function hiddenPower(ivs: Gen5HiddenGrottoIvTuple) {
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

function previewIvs(request: Gen5HiddenGrottoRequest) {
  if (request.pokemonFilters.disabled)
    return [31, 30, 29, 28, 27, 26] as Gen5HiddenGrottoIvTuple;
  for (let parityMask = 0; parityMask < 64; parityMask += 1) {
    const values: number[] = [];
    let valid = true;
    for (let index = 0; index < 6; index += 1) {
      const minimum = request.pokemonFilters.ivMin[index];
      const parity = (parityMask >>> index) & 1;
      const value = minimum + ((parity - minimum) & 1);
      if (value > request.pokemonFilters.ivMax[index]) {
        valid = false;
        break;
      }
      values.push(value);
    }
    if (!valid) continue;
    const ivs = values as Gen5HiddenGrottoIvTuple;
    if (
      request.pokemonFilters.hiddenPowerMask === 0 ||
      (request.pokemonFilters.hiddenPowerMask &
        (1 << hiddenPower(ivs).type)) !==
        0
    )
      return ivs;
  }
  return undefined;
}

function computeStats(
  request: Gen5HiddenGrottoRequest,
  ivs: Gen5HiddenGrottoIvTuple,
  nature: number,
  level: number,
) {
  const selected =
    request.area.pokemon[request.selectedGroup * 3 + request.selectedSlot];
  const base = getIvBaseStats("bw2", selected.species, selected.form);
  const natureBoost = Math.floor(nature / 5);
  const natureDrop = nature % 5;
  const statMap = [1, 2, 5, 3, 4];
  return base.map((value, index) => {
    if (index === 0)
      return Math.floor(((2 * value + ivs[index]) * level) / 100) + level + 10;
    const raw = Math.floor(((2 * value + ivs[index]) * level) / 100) + 5;
    const modifier =
      natureBoost === natureDrop
        ? 100
        : statMap[natureBoost] === index
          ? 110
          : statMap[natureDrop] === index
            ? 90
            : 100;
    return Math.floor((raw * modifier) / 100);
  }) as Gen5HiddenGrottoIvTuple;
}

function searchMetadata(request: Gen5HiddenGrottoRequest, index: number) {
  if (!isGen5HiddenGrottoSearcher(request)) return {};
  return {
    dateTime: `${request.startDate} 00:00:${String(index).padStart(2, "0")}`,
    timer0: request.profile.timer0Min,
    buttonMask: firstButton(request),
  };
}

function previewSlotResult(
  request: Gen5HiddenGrottoRequest,
  index: number,
): Gen5HiddenGrottoResult {
  const group = firstSelected(request.slotFilters.groupMask, 4);
  const slot = firstSelected(request.slotFilters.slotMask, 11);
  const item = slot >= 3;
  const data =
    slot < 3
      ? request.area.pokemon[group * 3 + slot].species
      : slot < 7
        ? request.area.items[group * 4 + slot - 3]
        : request.area.hiddenItems[group * 4 + slot - 7];
  const result: Gen5HiddenGrottoResult = {
    kind: "slot",
    seed: isGen5HiddenGrottoSearcher(request)
      ? (0x1234_5678_9abcn + BigInt(index))
          .toString(16)
          .toUpperCase()
          .padStart(16, "0")
      : request.seed.toUpperCase().padStart(16, "0"),
    advances: (request.initialAdvances + index) >>> 0,
    chatot: (index * 17) % 100,
    needle: index % 8,
    group,
    slot,
    item,
    data,
    gender: firstSelected(request.slotFilters.genderMask, 2) as 0 | 1,
    ...searchMetadata(request, index),
  };
  return validateGen5HiddenGrottoResult(request, result);
}

function previewPokemonResult(request: Gen5HiddenGrottoRequest, index: number) {
  const ivs = previewIvs(request);
  if (!ivs) return undefined;
  const selected =
    request.area.pokemon[request.selectedGroup * 3 + request.selectedSlot];
  const minimum = request.pokemonFilters.disabled
    ? selected.minLevel
    : Math.max(selected.minLevel, request.pokemonFilters.levelMin);
  const maximum = request.pokemonFilters.disabled
    ? selected.maxLevel
    : Math.min(selected.maxLevel, request.pokemonFilters.levelMax);
  if (minimum > maximum) return undefined;
  const nature = request.pokemonFilters.disabled
    ? index % 25
    : firstSelected(request.pokemonFilters.natureMask, 25);
  const pidValue = (0x1234_0000 + index * 0x101 + nature) >>> 0;
  const power = hiddenPower(ivs);
  const result: Gen5HiddenGrottoResult = {
    kind: "pokemon",
    seed: isGen5HiddenGrottoSearcher(request)
      ? (0x1234_5678_9abcn + BigInt(index))
          .toString(16)
          .toUpperCase()
          .padStart(16, "0")
      : request.seed.toUpperCase().padStart(16, "0"),
    advances: (request.initialAdvances + index) >>> 0,
    ivAdvances: request.initialIvAdvances,
    chatot: (index * 17) % 100,
    needle: index % 8,
    level: minimum,
    species: selected.species,
    form: selected.form,
    pid: pidValue.toString(16).toUpperCase().padStart(8, "0"),
    shiny: 0,
    nature,
    ability: 0,
    abilityIndex: 1,
    ivs,
    stats: computeStats(request, ivs, nature, minimum),
    hiddenPower: power.type,
    hiddenPowerStrength: power.power,
    gender: request.gender,
    characteristic: gen5HiddenGrottoCharacteristic(pidValue, ivs),
    ...searchMetadata(request, index),
  };
  return validateGen5HiddenGrottoResult(request, result);
}

export class Gen5HiddenGrottoUiPreviewEngine implements Gen5HiddenGrottoEngine {
  private cancelled = false;

  async search(
    request: Gen5HiddenGrottoRequest,
    options: Gen5HiddenGrottoOptions = {},
  ): Promise<Gen5HiddenGrottoSummary> {
    validateGen5HiddenGrottoRequest(request);
    this.cancelled = false;
    const startedAt = performance.now();
    const totalUnits = Number(gen5HiddenGrottoTaskCount(request));
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
    const resultLimit = Math.max(1, Math.min(request.resultLimit, 8));
    const count = Math.min(resultLimit, request.maxAdvances + 1);
    const results = Array.from({ length: count }, (_, index) =>
      request.operation.startsWith("slot")
        ? previewSlotResult(request, index)
        : previewPokemonResult(request, index),
    ).filter(
      (result): result is Gen5HiddenGrottoResult => result !== undefined,
    );
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
