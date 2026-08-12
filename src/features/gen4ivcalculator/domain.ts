import { computeGen3Stat } from "../shared/gen3Stats";
import type { Gen4BaseStats } from "./gen4IvData";

export type Gen4StatValues = [number, number, number, number, number, number];

export interface Gen4StatObservation {
  level: number;
  stats: Gen4StatValues;
}

export type Gen4IvCandidates = [
  number[],
  number[],
  number[],
  number[],
  number[],
  number[],
];

const characteristicIvOrder = [0, 1, 2, 5, 3, 4] as const;

function candidatesForObservation(
  baseStats: Gen4BaseStats,
  observation: Gen4StatObservation,
  nature?: number,
): Gen4IvCandidates {
  return baseStats.map((baseStat, statIndex) => {
    let minimum = 31;
    let maximum = 0;
    for (let iv = 0; iv <= 31; iv++) {
      const neutral = computeGen3Stat(
        baseStat,
        iv,
        nature ?? 0,
        observation.level,
        statIndex,
      );
      const matches =
        nature !== undefined
          ? neutral === observation.stats[statIndex]
          : neutral === observation.stats[statIndex] ||
            (statIndex !== 0 &&
              (Math.trunc(neutral * 0.9) === observation.stats[statIndex] ||
                Math.trunc(neutral * 1.1) === observation.stats[statIndex]));
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
  }) as Gen4IvCandidates;
}

function intersect(left: readonly number[], right: readonly number[]) {
  const accepted = new Set(right);
  return left.filter((value) => accepted.has(value));
}

function filterCharacteristic(
  candidates: Gen4IvCandidates,
  characteristic: number,
): Gen4IvCandidates {
  const statIndex = characteristicIvOrder[Math.trunc(characteristic / 5)];
  const remainder = characteristic % 5;
  const characteristicCandidates = candidates[statIndex].filter(
    (iv) =>
      iv % 5 === remainder &&
      candidates.every(
        (values) => values.length > 0 && iv >= Math.min(...values),
      ),
  );
  const highest = characteristicCandidates.at(-1) ?? -1;
  return candidates.map((values, index) =>
    index === statIndex
      ? characteristicCandidates
      : values.filter((iv) => iv <= highest),
  ) as Gen4IvCandidates;
}

function filterHiddenPower(
  candidates: Gen4IvCandidates,
  hiddenPower: number,
): Gen4IvCandidates {
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
  ) as Gen4IvCandidates;
}

export function calculateGen4IvRange(
  baseStats: Gen4BaseStats,
  observations: readonly Gen4StatObservation[],
  nature?: number,
  characteristic?: number,
  hiddenPower?: number,
): Gen4IvCandidates {
  if (observations.length === 0) return [[], [], [], [], [], []];
  let candidates = candidatesForObservation(baseStats, observations[0], nature);
  for (const observation of observations.slice(1)) {
    const current = candidatesForObservation(baseStats, observation, nature);
    candidates = candidates.map((values, index) =>
      intersect(values, current[index]),
    ) as Gen4IvCandidates;
  }
  if (characteristic !== undefined) {
    candidates = filterCharacteristic(candidates, characteristic);
  }
  return hiddenPower === undefined
    ? candidates
    : filterHiddenPower(candidates, hiddenPower);
}

export function calculateGen4NextLevels(
  baseStats: Gen4BaseStats,
  candidates: Gen4IvCandidates,
  level: number,
  nature?: number,
): Gen4StatValues {
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
  }) as Gen4StatValues;
}

export function formatGen4IvCandidates(candidates: readonly number[]) {
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
