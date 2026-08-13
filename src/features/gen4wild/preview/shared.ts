import type { Gen4IvTuple, Gen4WildFilters, Gen4WildState } from "../domain";

export const PREVIEW_SAMPLE_LIMIT = 500;
export const PREVIEW_STEP_LIMIT = 8;

export function hiddenPower(ivs: Gen4IvTuple) {
  const typeBits =
    (ivs[0] & 1) |
    ((ivs[1] & 1) << 1) |
    ((ivs[2] & 1) << 2) |
    ((ivs[5] & 1) << 3) |
    ((ivs[3] & 1) << 4) |
    ((ivs[4] & 1) << 5);
  const powerBits =
    ((ivs[0] >> 1) & 1) |
    (((ivs[1] >> 1) & 1) << 1) |
    (((ivs[2] >> 1) & 1) << 2) |
    (((ivs[5] >> 1) & 1) << 3) |
    (((ivs[3] >> 1) & 1) << 4) |
    (((ivs[4] >> 1) & 1) << 5);
  return {
    type: Math.trunc((typeBits * 15) / 63),
    strength: 30 + Math.trunc((powerBits * 40) / 63),
  };
}

export function previewGender(pid: number, ratio: number) {
  if (ratio === 255) return 2;
  if (ratio === 254) return 1;
  if (ratio === 0) return 0;
  return (pid & 0xff) < ratio ? 1 : 0;
}

export function matchesFilters(filters: Gen4WildFilters, state: Gen4WildState) {
  return (
    (filters.shiny === "any" ||
      (filters.shiny === "notShiny" && state.shiny === 0) ||
      (filters.shiny === "shiny" && state.shiny !== 0)) &&
    (filters.gender === "any" ||
      (filters.gender === "male" && state.gender === 0) ||
      (filters.gender === "female" && state.gender === 1) ||
      (filters.gender === "genderless" && state.gender === 2)) &&
    (filters.ability === "any" ||
      (filters.ability === "first" && state.ability === 0) ||
      (filters.ability === "second" && state.ability === 1)) &&
    (filters.natureMask & (1 << state.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << state.hiddenPower)) !== 0 &&
    (filters.encounterSlotMask & (1 << state.encounterSlot)) !== 0 &&
    state.level >= filters.levelMin &&
    state.level <= filters.levelMax &&
    state.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

export function pause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}
