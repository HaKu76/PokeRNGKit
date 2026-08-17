import { getGen8WildSlots } from "../encounters";
import {
  gen8WildSettings,
  gen8WildTaskCount,
  validateGen8WildRequest,
  validateGen8WildResult,
  type Gen8WildRequest,
  type Gen8WildResult,
} from "../domain";
import type { Gen8WildEngine, Gen8WildSearchOptions } from "../search";

function previewResult(request: Gen8WildRequest): Gen8WildResult | undefined {
  const slot = getGen8WildSlots(gen8WildSettings(request))[0];
  if (!slot) return undefined;
  const ivs = [31, 31, 31, 31, 31, 31] as Gen8WildResult["ivs"];
  const level = slot.maxLevel;
  const result: Gen8WildResult = {
    advances: request.initialAdvances,
    item: 0,
    slot: 0,
    species: slot.species,
    form: 0,
    level,
    ec: "12345678",
    pid: "12345678",
    shiny: 0,
    nature: request.lead <= 24 ? request.lead : 0,
    ability: 0,
    abilityIndex: 0,
    ivs,
    stats: [level + 10, 5, 5, 5, 5, 5],
    hiddenPower: 15,
    gender: 2,
    height: 64,
    weight: 64,
    characteristic: 0,
  };
  try {
    return validateGen8WildResult(request, result);
  } catch {
    return undefined;
  }
}

export class Gen8WildUiPreviewEngine implements Gen8WildEngine {
  private cancelled = false;

  async search(request: Gen8WildRequest, options: Gen8WildSearchOptions = {}) {
    validateGen8WildRequest(request);
    this.cancelled = false;
    await Promise.resolve();
    const cancelled = this.cancelled || options.signal?.aborted === true;
    const result = cancelled ? undefined : previewResult(request);
    const results = result ? [result] : [];
    const totalStates = gen8WildTaskCount(request);
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
