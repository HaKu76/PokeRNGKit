import {
  gen4WildSearcherCombinationCount,
  GEN4_WILD_MAX_RESULTS,
  type Gen4IvTuple,
  type Gen4WildSearcherRequest,
  type Gen4WildSearcherState,
} from "../domain";
import type {
  Gen4WildProgress,
  Gen4WildSearcherEngine,
  Gen4WildSearcherOptions,
  Gen4WildSummary,
} from "../worker/Gen4WildWorkerPool";
import {
  hiddenPower,
  matchesFilters,
  pause,
  PREVIEW_SAMPLE_LIMIT,
  PREVIEW_STEP_LIMIT,
  previewGender,
} from "./shared";

function ivsAtIndex(request: Gen4WildSearcherRequest, index: number) {
  const ivs: Gen4IvTuple = [0, 0, 0, 0, 0, 0];
  for (let stat = 5; stat >= 0; stat--) {
    const size = request.filters.ivMax[stat] - request.filters.ivMin[stat] + 1;
    ivs[stat] = request.filters.ivMin[stat] + (index % size);
    index = Math.floor(index / size);
  }
  return ivs;
}

function previewState(
  request: Gen4WildSearcherRequest,
  combinationIndex: number,
): Gen4WildSearcherState {
  const ivs = ivsAtIndex(request, combinationIndex);
  let mixed =
    (Math.imul(combinationIndex + 1, 0x045d9f3b) ^
      request.profile.tid ^
      (request.profile.sid << 16) ^
      request.area.location) >>>
    0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  const pid = (mixed ^ (mixed >>> 16)) >>> 0;
  const slotIndex =
    request.method === "honeyTree" || request.method === "pokeRadar"
      ? request.fixedSlot
      : mixed % request.area.slots.length;
  const slot = request.area.slots[slotIndex];
  const delayWidth = request.maxDelay - request.minDelay + 1;
  const delay = request.minDelay + (mixed % delayWidth);
  const hour = (mixed >>> 24) % 24;
  const seed = ((mixed & 0xff000000) | (hour << 16) | delay) >>> 0;
  const power = hiddenPower(ivs);
  return {
    seed,
    delay,
    hour,
    advances:
      request.minAdvance +
      (mixed % (request.maxAdvance - request.minAdvance + 1)),
    battleAdvances: 0,
    pid,
    ivs,
    ability: pid & 1,
    gender: previewGender(pid, slot.genderRatio),
    level: slot.minLevel + (mixed % (slot.maxLevel - slot.minLevel + 1)),
    nature: pid % 25,
    shiny: request.pokeRadarShiny && combinationIndex % 7 === 0 ? 1 : 0,
    hiddenPower: power.type,
    hiddenPowerStrength: power.strength,
    encounterSlot: slotIndex,
    species: slot.species,
    form: slot.form,
    item: slot.items[(mixed >>> 8) % 2],
    call: 0,
    chatot: 0,
  };
}

export class Gen4WildSearcherUiPreviewEngine implements Gen4WildSearcherEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Gen4WildSearcherRequest,
    options: Gen4WildSearcherOptions = {},
  ): Promise<Gen4WildSummary> {
    if (this.running) {
      throw new Error("A Gen4 wild searcher UI preview is already running.");
    }
    this.running = true;
    const startedAt = performance.now();
    const totalStates = gen4WildSearcherCombinationCount(request);
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? GEN4_WILD_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = (): Gen4WildProgress => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    try {
      for (let step = 0; step < stepCount && !cancelled; step++) {
        await pause(this.stepDelayMs);
        if (cancelled) break;
        const start = Math.floor((step * sampleCount) / stepCount);
        const end = Math.floor(((step + 1) * sampleCount) / stepCount);
        const batch = Array.from({ length: end - start }, (_, index) => {
          const sampleIndex = start + index;
          const combinationIndex =
            sampleCount <= 1
              ? 0
              : Math.floor(
                  (sampleIndex * (totalStates - 1)) / (sampleCount - 1),
                );
          return previewState(request, combinationIndex);
        }).filter((state) => matchesFilters(request.filters, state));
        const remaining = maxResults - resultCount;
        const visible = batch.slice(0, Math.max(0, remaining));
        if (visible.length > 0) options.onBatch?.(visible);
        resultCount += visible.length;
        if (batch.length > remaining) resultLimitReached = true;
        processedStates = Math.floor(((step + 1) * totalStates) / stepCount);
        report();
        if (resultLimitReached) break;
      }
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount: 0,
        cancelled,
        resultLimitReached,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }

  dispose() {
    this.cancel();
  }
}
