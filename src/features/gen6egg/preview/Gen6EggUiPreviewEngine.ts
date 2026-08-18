import {
  gen6EggResultPassesFilters,
  gen6EggTaskCount,
  validateGen6EggRequest,
  type Gen6EggIvTuple,
  type Gen6EggRequest,
  type Gen6EggResult,
} from "../domain";
import type {
  Gen6EggEngine,
  Gen6EggSearchOptions,
  Gen6EggSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function preview(request: Gen6EggRequest, frame: number): Gen6EggResult {
  const random = mix(request.mainSeed ^ frame);
  const pid =
    request.acceptEgg && !request.shinyCharm && !request.masudaMethod
      ? mix(random)
      : mix(random ^ request.key0);
  const xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const ivs = request.maleIvs.map((value, index) =>
    index & 1 ? request.femaleIvs[index] : value,
  ) as Gen6EggIvTuple;
  return {
    frame,
    current: frame < 0,
    random,
    eggSeed: (BigInt(mix(random ^ 1)) << 32n) | BigInt(mix(random ^ 2)),
    ec: mix(random ^ 3),
    pid,
    ivs,
    nature: random % 25,
    ability: (random & 1) + 1,
    gender: request.genderRatio === "genderless" ? 0 : (random & 1) + 1,
    hiddenPower: random % 16,
    shiny: xorValue >>> 4 === request.tsv,
    squareShiny:
      xorValue >>> 4 === request.tsv && (xorValue & 15) === request.trv,
    inheritedMaleMask: 0b010101,
    inheritedFemaleMask: 0b101010,
    natureParent:
      request.maleItem === "everstone"
        ? "male"
        : request.femaleItem === "everstone"
          ? "female"
          : "any",
    psv: xorValue >>> 4,
    prv: xorValue & 15,
  };
}

export class Gen6EggUiPreviewEngine implements Gen6EggEngine {
  private cancelled = false;
  async search(
    request: Gen6EggRequest,
    options: Gen6EggSearchOptions = {},
  ): Promise<Gen6EggSummary> {
    validateGen6EggRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen6EggTaskCount(request), 256);
    const accepted: Gen6EggResult[] = [preview(request, -1)];
    this.cancelled = options.signal?.aborted ?? false;
    for (let index = 0; index < totalStates && !this.cancelled; ++index) {
      const result = preview(request, request.minFrame + index);
      if (gen6EggResultPassesFilters(request, result)) accepted.push(result);
      if (accepted.length >= request.resultLimit) break;
    }
    if (accepted.length) options.onBatch?.(accepted);
    const processedStates = this.cancelled ? 0 : totalStates;
    const progress = {
      processedStates,
      totalStates,
      resultCount: accepted.length,
      percent: totalStates ? (processedStates / totalStates) * 100 : 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: this.cancelled,
      resultLimitReached:
        accepted.length >= request.resultLimit && processedStates < totalStates,
    };
  }
  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancelled = true;
  }
}
