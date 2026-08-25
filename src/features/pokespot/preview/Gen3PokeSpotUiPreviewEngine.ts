import { gen3HiddenPower } from "../../shared/gen3HiddenPower";
import { passesPerfectIvFilter } from "../../shared/perfectIvFilter";
import { POKE_SPOT_LOCATIONS } from "../encounters";
import type { Gen3PokeSpotRequest, Gen3PokeSpotState } from "../domain";
import type {
  Gen3PokeSpotEngine,
  Gen3PokeSpotOptions,
  Gen3PokeSpotSummary,
} from "../search";

export class Gen3PokeSpotUiPreviewEngine implements Gen3PokeSpotEngine {
  private cancelled = false;

  async search(
    request: Gen3PokeSpotRequest,
    options: Gen3PokeSpotOptions = {},
  ): Promise<Gen3PokeSpotSummary> {
    this.cancelled = false;
    const startedAt = performance.now();
    const totalFoodStates = request.foodMaxAdvances + 1;
    const totalStates = totalFoodStates * (request.encounterMaxAdvances + 1);
    const states: Gen3PokeSpotState[] = [];
    const slots = POKE_SPOT_LOCATIONS[request.location].slots;
    for (let index = 0; index < Math.min(8, totalFoodStates); index++) {
      if (this.cancelled || options.signal?.aborted) break;
      const mixed =
        (request.foodSeed ^
          Math.imul(index + request.foodInitialAdvances, 0x045d_9f3b) ^
          request.location) >>>
        0;
      const slot = index % slots.length;
      const entry = slots[slot];
      const ivs: [number, number, number, number, number, number] = [
        mixed & 31,
        (mixed >>> 5) & 31,
        (mixed >>> 10) & 31,
        (mixed >>> 15) & 31,
        (mixed >>> 20) & 31,
        (mixed >>> 25) & 31,
      ];
      const ability = mixed & 1;
      const gender = (mixed & 0xff) < 127 ? 1 : 0;
      const nature = mixed % 25;
      const shiny = 0;
      if ((request.filters.slotMask & (1 << slot)) === 0) continue;
      if ((request.filters.natureMask & (1 << nature)) === 0) continue;
      if (
        (request.filters.hiddenPowerMask & (1 << gen3HiddenPower(ivs).type)) ===
        0
      )
        continue;
      if (
        ivs.some(
          (iv, ivIndex) =>
            iv < request.filters.ivMin[ivIndex] ||
            iv > request.filters.ivMax[ivIndex],
        )
      )
        continue;
      if (
        !passesPerfectIvFilter(
          ivs,
          request.filters.perfectIvValue,
          request.filters.perfectIvCount,
        )
      )
        continue;
      if (
        request.filters.ability !== "any" &&
        (request.filters.ability === "first" ? ability !== 0 : ability !== 1)
      )
        continue;
      if (
        request.filters.gender !== "any" &&
        (request.filters.gender === "male" ? gender !== 0 : gender !== 1)
      )
        continue;
      if (request.filters.shiny !== "any" && shiny === 0) continue;
      states.push({
        foodAdvances: request.foodInitialAdvances + index,
        encounterAdvances: request.encounterInitialAdvances + index,
        pid: mixed,
        species: entry.species,
        slot,
        ivs,
        ability,
        gender,
        level: entry.minLevel + (mixed % (entry.maxLevel - entry.minLevel + 1)),
        nature,
        shiny,
      });
    }
    options.onBatch?.(states);
    const cancelled = this.cancelled || Boolean(options.signal?.aborted);
    const processedStates = cancelled
      ? Math.min(8, totalFoodStates) * (request.encounterMaxAdvances + 1)
      : totalStates;
    const progress = {
      processedStates,
      totalStates,
      resultCount: states.length,
      percent: (processedStates / totalStates) * 100,
    };
    options.onProgress?.(progress);
    return {
      ...progress,
      elapsedMs: performance.now() - startedAt,
      workerCount: 0,
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
