import {
  gen8RaidCharacteristic,
  gen8RaidTaskCount,
  gen8RaidTsv,
  validateGen8RaidRequest,
  validateGen8RaidResult,
  type Gen8RaidRequest,
  type Gen8RaidResult,
} from "../domain";
import { getGen8RaidPersonal } from "../data";
import type { Gen8RaidEngine, Gen8RaidSearchOptions } from "../search";

function pidForShiny(request: Gen8RaidRequest, shiny: number) {
  const low = 0x1234;
  const tsv = gen8RaidTsv(request);
  const psv = shiny === 2 ? tsv : shiny === 1 ? tsv ^ 1 : tsv ^ 0x10;
  return ((((psv ^ low) & 0xffff) << 16) | low) >>> 0;
}
function statValues(
  request: Gen8RaidRequest,
  ivs: Gen8RaidResult["ivs"],
  nature: number,
) {
  const base = getGen8RaidPersonal(
    request.template.species,
    request.template.form,
  ).stats;
  const natureMap = [1, 2, 5, 3, 4] as const;
  const raised = natureMap[Math.floor(nature / 5)];
  const lowered = natureMap[nature % 5];
  return base.map((value, index) => {
    const scaled = Math.floor(((2 * value + ivs[index]) * request.level) / 100);
    if (index === 0) return scaled + request.level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8RaidResult["stats"];
}
function previewResult(request: Gen8RaidRequest): Gen8RaidResult | undefined {
  const shiny =
    request.template.shiny === 2 ? 2 : request.template.shiny === 1 ? 0 : 0;
  const ability = request.template.ability <= 2 ? request.template.ability : 0;
  const gender =
    request.template.gender === 0
      ? request.genderRatio === 254
        ? 1
        : request.genderRatio === 255
          ? 2
          : 0
      : request.template.gender - 1;
  const nature =
    request.template.species === 849 && request.template.form !== 0 ? 1 : 0;
  const ivs = [31, 31, 31, 31, 31, 31] as Gen8RaidResult["ivs"];
  const ec = 0x12345678;
  const pid =
    request.template.shiny === 0 || request.template.shiny === 2
      ? pidForShiny(request, shiny)
      : pidForShiny(request, 0);
  const result: Gen8RaidResult = {
    advances: request.initialAdvances,
    ec: ec.toString(16).toUpperCase(),
    pid: pid.toString(16).toUpperCase().padStart(8, "0"),
    shiny,
    nature,
    ability,
    abilityIndex: getGen8RaidPersonal(
      request.template.species,
      request.template.form,
    ).abilities[ability],
    ivs,
    stats: statValues(request, ivs, nature),
    gender,
    height: 64,
    weight: 64,
    characteristic: gen8RaidCharacteristic(ec, ivs),
    species: request.template.species,
    form: request.template.form,
    starMask: request.template.starMask,
    gigantamax: request.template.gigantamax,
  };
  try {
    return validateGen8RaidResult(request, result);
  } catch {
    return undefined;
  }
}

export class Gen8RaidsUiPreviewEngine implements Gen8RaidEngine {
  private cancelled = false;
  async search(request: Gen8RaidRequest, options: Gen8RaidSearchOptions = {}) {
    validateGen8RaidRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalStates = gen8RaidTaskCount(request);
    if (results.length) options.onBatch?.(results);
    options.onProgress?.({
      processedStates: cancelled ? 0 : totalStates,
      totalStates,
      resultCount: results.length,
      percent: cancelled ? 0 : 100,
    });
    return {
      processedStates: cancelled ? 0 : totalStates,
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
