export type IvTuple = [number, number, number, number, number, number];

type IvBounds = readonly [number, number, number, number, number, number];

function suffixCounts(
  ivMin: IvBounds,
  ivMax: IvBounds,
  perfectIvValue: number,
) {
  const counts = Array.from({ length: 7 }, () => Array(7).fill(0));
  counts[6][0] = 1;
  for (let stat = 5; stat >= 0; stat--) {
    const width = ivMax[stat] - ivMin[stat] + 1;
    const perfect = Math.max(
      0,
      ivMax[stat] - Math.max(ivMin[stat], perfectIvValue) + 1,
    );
    const ordinary = width - perfect;
    for (let exact = 0; exact <= 6; exact++) {
      counts[stat][exact] =
        ordinary * counts[stat + 1][exact] +
        perfect * (exact === 0 ? 0 : counts[stat + 1][exact - 1]);
    }
  }
  return counts;
}

function atLeast(counts: number[], minimum: number) {
  if (minimum <= 0) return counts.reduce((total, value) => total + value, 0);
  if (minimum > 6) return 0;
  return counts.slice(minimum).reduce((total, value) => total + value, 0);
}

export function countIvCombinations(
  ivMin: IvBounds,
  ivMax: IvBounds,
  perfectIvValue: number,
  perfectIvCount: number,
) {
  return atLeast(suffixCounts(ivMin, ivMax, perfectIvValue)[0], perfectIvCount);
}

export function ivCombinationAtIndex(
  index: number,
  ivMin: IvBounds,
  ivMax: IvBounds,
  perfectIvValue: number,
  perfectIvCount: number,
): IvTuple {
  const suffix = suffixCounts(ivMin, ivMax, perfectIvValue);
  const total = atLeast(suffix[0], perfectIvCount);
  if (!Number.isSafeInteger(index) || index < 0 || index >= total) {
    throw new RangeError("IV combination index is outside the filtered range.");
  }

  const ivs = [0, 0, 0, 0, 0, 0] as IvTuple;
  let perfect = 0;
  for (let stat = 0; stat < 6; stat++) {
    for (let value = ivMin[stat]; value <= ivMax[stat]; value++) {
      const nextPerfect = perfect + (value >= perfectIvValue ? 1 : 0);
      const completions = atLeast(
        suffix[stat + 1],
        perfectIvCount - nextPerfect,
      );
      if (index < completions) {
        ivs[stat] = value;
        perfect = nextPerfect;
        break;
      }
      index -= completions;
    }
  }
  return ivs;
}
