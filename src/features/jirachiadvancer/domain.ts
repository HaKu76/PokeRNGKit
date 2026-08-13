export const GEN3_JIRACHI_API_VERSION = 1;

export interface Gen3JirachiRequest {
  startingSeed: number;
  targetSeed: number;
  maxAdvances: number;
  bruteForceRange: number;
}

export type Gen3JirachiAction = 0 | 1 | 2 | 3;

export interface Gen3JirachiResult {
  targetAdvances: number;
  actions: Gen3JirachiAction[];
}

const isUint32 = (value: number) =>
  Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;

export function validateGen3JirachiRequest(
  request: Gen3JirachiRequest,
): string[] {
  return Object.entries(request)
    .filter(([, value]) => !isUint32(value))
    .map(([key]) => key);
}

export function decodeGen3JirachiActions(buffer: ArrayBuffer) {
  return Array.from(new Uint32Array(buffer), (value) => {
    if (value === 255) return 3 as const;
    if (value > 3) {
      throw new RangeError("Gen3 Jirachi core returned an invalid action.");
    }
    return value as Gen3JirachiAction;
  });
}
