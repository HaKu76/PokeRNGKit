import type {
  Gen3WildRequest,
  Gen3WildSearcherRequest,
  Gen3WildState,
} from "../domain";
import type { Gen3WildSearchOptions, Gen3WildSearchSummary } from "../search";

function previewState(
  request: Pick<Gen3WildRequest, "area" | "tid" | "sid">,
  seed: number,
): Gen3WildState {
  const slot = request.area.slots[0];
  return {
    advances: seed >>> 0,
    pid: 0x3c6ef35f,
    ivs: [31, 12, 27, 4, 18, 30],
    ability: 1,
    gender: slot.genderRatio === 255 ? 2 : 0,
    level: slot.minLevel,
    nature: 17,
    shiny: request.tid === request.sid ? 2 : 0,
    encounterSlot: 0,
    species: slot.species,
    form: slot.form,
  };
}

/** UI-only deterministic data. Production Wild calculations stay in Wasm Workers. */
export class Gen3WildUiPreviewEngine {
  private cancelled = false;

  async search(
    request: Gen3WildRequest,
    options: Gen3WildSearchOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    return this.run(
      request,
      request.initialAdvances,
      request.maxAdvances + 1,
      options,
    );
  }

  async searchIvs(
    request: Gen3WildSearcherRequest,
    options: Gen3WildSearchOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    return this.run(request, 0x5a0, 1, options);
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancel();
  }

  private async run(
    request: Pick<Gen3WildRequest, "area" | "tid" | "sid">,
    seed: number,
    totalStates: number,
    options: Gen3WildSearchOptions,
  ): Promise<Gen3WildSearchSummary> {
    this.cancelled = false;
    await Promise.resolve();
    const states = this.cancelled ? [] : [previewState(request, seed)];
    options.onBatch?.(states);
    const progress = {
      processedStates: this.cancelled ? 0 : totalStates,
      totalStates,
      resultCount: states.length,
      percent: this.cancelled ? 0 : 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: 0,
      workerCount: 0,
      cancelled: this.cancelled,
      resultLimitReached: false,
    };
  }
}
