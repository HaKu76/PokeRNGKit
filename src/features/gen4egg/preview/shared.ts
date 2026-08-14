import type { Gen4EggFilters, Gen4EggIvTuple, Gen4EggState } from "../domain";

export const GEN4_EGG_PREVIEW_SAMPLE_LIMIT = 320;
export const GEN4_EGG_PREVIEW_STEP_LIMIT = 8;

export function gen4EggPreviewHiddenPower(ivs: Gen4EggIvTuple) {
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

export function gen4EggPreviewGender(pid: number, ratio: number) {
  if (ratio === 255) return 2;
  if (ratio === 254) return 1;
  if (ratio === 0) return 0;
  return (pid & 0xff) < ratio ? 1 : 0;
}

export function gen4EggPreviewMatchesFilters(
  filters: Gen4EggFilters,
  state: Gen4EggState,
) {
  return (
    (filters.shiny === "any" ||
      (filters.shiny === "notShiny" && state.shiny === 0) ||
      (filters.shiny === "star" && state.shiny === 1) ||
      (filters.shiny === "square" && state.shiny === 2) ||
      (filters.shiny === "starSquare" && state.shiny !== 0)) &&
    (filters.gender === "any" ||
      (filters.gender === "male" && state.gender === 0) ||
      (filters.gender === "female" && state.gender === 1) ||
      (filters.gender === "genderless" && state.gender === 2)) &&
    (filters.ability === "any" ||
      (filters.ability === "first" && state.ability === 0) ||
      (filters.ability === "second" && state.ability === 1)) &&
    (filters.natureMask & (1 << state.nature)) !== 0 &&
    (filters.hiddenPowerMask & (1 << state.hiddenPower)) !== 0 &&
    state.ivs.every(
      (value, index) =>
        value >= filters.ivMin[index] && value <= filters.ivMax[index],
    )
  );
}

export function gen4EggPreviewPause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}

export function gen4EggPreviewMix(value: number) {
  let mixed = Math.imul(value ^ (value >>> 16), 0x045d9f3b) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d9f3b) >>> 0;
  return (mixed ^ (mixed >>> 16)) >>> 0;
}
