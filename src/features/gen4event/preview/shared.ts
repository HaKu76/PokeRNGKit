import type { Gen4EventIvTuple } from "../domain";

export const GEN4_EVENT_PREVIEW_SAMPLE_LIMIT = 500;
export const GEN4_EVENT_PREVIEW_STEP_LIMIT = 8;

export function gen4EventHiddenPower(ivs: Gen4EventIvTuple) {
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

export function pause(delayMs: number) {
  return new Promise<void>((resolve) =>
    globalThis.setTimeout(resolve, delayMs),
  );
}
