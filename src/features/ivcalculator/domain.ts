import { computeGen3Stat, type Gen3StatValues } from "../shared/gen3Stats";

export interface Gen3StatObservation {
  level: number;
  stats: Gen3StatValues;
}

export type Gen3IvCandidates = [
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
];

function candidatesForObservation(
  baseStats: readonly number[],
  observation: Gen3StatObservation,
  nature?: number,
): Gen3IvCandidates {
  return baseStats.map((baseStat, statIndex) => {
    let minimum = 31;
    let maximum = 0;
    for (let iv = 0; iv <= 31; iv++) {
      let matches: boolean;
      if (nature !== undefined) {
        matches =
          computeGen3Stat(
            baseStat,
            iv,
            nature,
            observation.level,
            statIndex,
          ) === observation.stats[statIndex];
      } else {
        const neutral = computeGen3Stat(
          baseStat,
          iv,
          0,
          observation.level,
          statIndex,
        );
        matches =
          neutral === observation.stats[statIndex] ||
          (statIndex !== 0 &&
            (Math.trunc(neutral * 0.9) === observation.stats[statIndex] ||
              Math.trunc(neutral * 1.1) === observation.stats[statIndex]));
      }
      if (!matches) continue;
      minimum = Math.min(minimum, iv);
      maximum = Math.max(maximum, iv);
    }
    return minimum > maximum
      ? []
      : Array.from(
          { length: maximum - minimum + 1 },
          (_, index) => minimum + index,
        );
  }) as Gen3IvCandidates;
}

function intersect(left: readonly number[], right: readonly number[]) {
  const accepted = new Set(right);
  return left.filter((value) => accepted.has(value));
}

function filterHiddenPower(
  candidates: Gen3IvCandidates,
  hiddenPower: number,
): Gen3IvCandidates {
  const allowedParity = Array.from({ length: 6 }, () => new Set<number>());
  for (let bits = 0; bits < 64; bits++) {
    const type = Math.trunc((bits * 15) / 63);
    if (type !== hiddenPower) continue;
    const parity = [
      bits & 1,
      (bits >> 1) & 1,
      (bits >> 2) & 1,
      (bits >> 4) & 1,
      (bits >> 5) & 1,
      (bits >> 3) & 1,
    ];
    if (
      parity.every((value, index) =>
        candidates[index].some((iv) => (iv & 1) === value),
      )
    ) {
      parity.forEach((value, index) => allowedParity[index].add(value));
    }
  }
  return candidates.map((values, index) =>
    values.filter((iv) => allowedParity[index].has(iv & 1)),
  ) as Gen3IvCandidates;
}

export function calculateGen3IvRange(
  baseStats: readonly number[],
  observations: readonly Gen3StatObservation[],
  nature?: number,
  hiddenPower?: number,
): Gen3IvCandidates {
  if (observations.length === 0) {
    return [[], [], [], [], [], []];
  }
  let candidates = candidatesForObservation(baseStats, observations[0], nature);
  for (const observation of observations.slice(1)) {
    const current = candidatesForObservation(baseStats, observation, nature);
    candidates = candidates.map((values, index) =>
      intersect(values, current[index]),
    ) as Gen3IvCandidates;
  }
  return hiddenPower === undefined
    ? candidates
    : filterHiddenPower(candidates, hiddenPower);
}

export function calculateGen3NextLevels(
  baseStats: readonly number[],
  candidates: Gen3IvCandidates,
  level: number,
  nature?: number,
): Gen3StatValues {
  return candidates.map((values, statIndex) => {
    if (values.length < 2) return level;
    for (let nextLevel = level + 1; nextLevel <= 100; nextLevel++) {
      for (let index = 1; index < values.length; index++) {
        const previous = computeGen3Stat(
          baseStats[statIndex],
          values[index - 1],
          nature ?? 0,
          nextLevel,
          statIndex,
        );
        const current = computeGen3Stat(
          baseStats[statIndex],
          values[index],
          nature ?? 0,
          nextLevel,
          statIndex,
        );
        if (previous < current) return nextLevel;
      }
    }
    return level;
  }) as Gen3StatValues;
}

export function formatGen3IvCandidates(candidates: readonly number[]) {
  if (candidates.length === 0) return undefined;
  const ranges: string[] = [];
  let start = candidates[0];
  let end = start;
  for (const value of candidates.slice(1)) {
    if (value === end + 1) {
      end = value;
      continue;
    }
    ranges.push(start === end ? String(start) : `${start}-${end}`);
    start = value;
    end = value;
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(", ");
}
