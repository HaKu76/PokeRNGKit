export const DEFAULT_PERFECT_IV_VALUE = 31;
export const DEFAULT_PERFECT_IV_COUNT = 0;

export interface PerfectIvFilter {
  perfectIvValue: number;
  perfectIvCount: number;
}

export const DEFAULT_PERFECT_IV_FILTER: Readonly<PerfectIvFilter> = {
  perfectIvValue: DEFAULT_PERFECT_IV_VALUE,
  perfectIvCount: DEFAULT_PERFECT_IV_COUNT,
};

export function validatePerfectIvFilter(value: unknown, count: unknown) {
  return (
    Number.isInteger(value) &&
    Number(value) >= 0 &&
    Number(value) <= 31 &&
    Number.isInteger(count) &&
    Number(count) >= 0 &&
    Number(count) <= 6
  );
}

export function passesPerfectIvFilter(
  ivs: readonly number[],
  value: number,
  count: number,
) {
  return ivs.filter((iv) => iv >= value).length >= count;
}
