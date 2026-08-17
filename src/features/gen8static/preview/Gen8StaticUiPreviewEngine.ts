import { getIvBaseStats } from "../../gen4ivcalculator/gen4IvData";
import {
  gen8StaticCharacteristic,
  gen8StaticTaskCount,
  validateGen8StaticRequest,
  validateGen8StaticResult,
  type Gen8StaticRequest,
  type Gen8StaticResult,
} from "../domain";
import type { Gen8StaticEngine, Gen8StaticSearchOptions } from "../search";

function nonShinyPid(request: Gen8StaticRequest) {
  const low = 0x1234;
  const psv = (request.profile.tid ^ request.profile.sid ^ 0x10) & 0xffff;
  return ((((psv ^ low) & 0xffff) << 16) | low) >>> 0;
}

function statValues(
  request: Gen8StaticRequest,
  ivs: Gen8StaticResult["ivs"],
  nature: number,
) {
  const base = getIvBaseStats(
    "bdsp",
    request.template.species,
    request.template.form,
  );
  const natureMap = [1, 2, 5, 3, 4] as const;
  const raised = natureMap[Math.floor(nature / 5)];
  const lowered = natureMap[nature % 5];
  const level = request.template.level;
  return base.map((value, index) => {
    const scaled = Math.floor(((2 * value + ivs[index]) * level) / 100);
    if (index === 0) return scaled + level + 10;
    const raw = scaled + 5;
    if (raised === lowered) return raw;
    if (index === raised) return Math.floor(raw * 1.1);
    if (index === lowered) return Math.floor(raw * 0.9);
    return raw;
  }) as Gen8StaticResult["stats"];
}

function previewResult(
  request: Gen8StaticRequest,
): Gen8StaticResult | undefined {
  const ability =
    request.template.roamer || request.template.ability === 255
      ? 0
      : request.template.ability;
  const gender =
    request.template.genderRatio === 255
      ? 2
      : request.template.genderRatio === 254
        ? 1
        : 0;
  const nature = request.lead <= 24 ? request.lead : 0;
  const ivs = [31, 31, 31, 31, 31, 31] as Gen8StaticResult["ivs"];
  const ec = 0x12345678;
  const result: Gen8StaticResult = {
    advances: request.initialAdvances,
    ec: ec.toString(16).toUpperCase().padStart(8, "0"),
    pid: nonShinyPid(request).toString(16).toUpperCase().padStart(8, "0"),
    shiny: 0,
    nature,
    ability,
    abilityIndex: request.template.abilityIds[ability],
    ivs,
    stats: statValues(request, ivs, nature),
    gender,
    height: 64,
    weight: 64,
    characteristic: gen8StaticCharacteristic(ec, ivs),
  };
  try {
    return validateGen8StaticResult(request, result);
  } catch {
    return undefined;
  }
}

export class Gen8StaticUiPreviewEngine implements Gen8StaticEngine {
  private cancelled = false;

  async search(
    request: Gen8StaticRequest,
    options: Gen8StaticSearchOptions = {},
  ) {
    validateGen8StaticRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalStates = gen8StaticTaskCount(request);
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
