export type Gen3StatValues = [number, number, number, number, number, number];

const natureModifiers: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [1.1, 0.9, 1, 1, 1],
  [1.1, 1, 1, 1, 0.9],
  [1.1, 1, 0.9, 1, 1],
  [1.1, 1, 1, 0.9, 1],
  [0.9, 1.1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1.1, 1, 1, 0.9],
  [1, 1.1, 0.9, 1, 1],
  [1, 1.1, 1, 0.9, 1],
  [0.9, 1, 1, 1, 1.1],
  [1, 0.9, 1, 1, 1.1],
  [1, 1, 1, 1, 1],
  [1, 1, 0.9, 1, 1.1],
  [1, 1, 1, 0.9, 1.1],
  [0.9, 1, 1.1, 1, 1],
  [1, 0.9, 1.1, 1, 1],
  [1, 1, 1.1, 1, 0.9],
  [1, 1, 1, 1, 1],
  [1, 1, 1.1, 0.9, 1],
  [0.9, 1, 1, 1.1, 1],
  [1, 0.9, 1, 1.1, 1],
  [1, 1, 1, 1.1, 0.9],
  [1, 1, 0.9, 1.1, 1],
  [1, 1, 1, 1, 1],
];

export function computeGen3Stat(
  baseStat: number,
  iv: number,
  nature: number,
  level: number,
  index: number,
) {
  const unmodified = Math.trunc(((2 * baseStat + iv) * level) / 100);
  if (index === 0) return unmodified + level + 10;
  return Math.trunc(
    (unmodified + 5) * (natureModifiers[nature]?.[index - 1] ?? 1),
  );
}

export function computeGen3Stats(
  baseStats: readonly number[],
  ivs: readonly number[],
  nature: number,
  level: number,
): Gen3StatValues {
  return baseStats.map((baseStat, index) =>
    computeGen3Stat(baseStat, ivs[index], nature, level, index),
  ) as Gen3StatValues;
}
