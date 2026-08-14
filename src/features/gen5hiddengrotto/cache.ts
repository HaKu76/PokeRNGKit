import {
  parseGen5WildIvCache,
  parseGen5WildShaCache,
  type Gen5WildIvCache,
  type Gen5WildShaCache,
} from "../gen5wild/cache";
import {
  isGen5HiddenGrottoButtonMaskAllowed,
  type Gen5HiddenGrottoPreparedCache,
  type Gen5HiddenGrottoSearcherRequest,
} from "./domain";

export type Gen5HiddenGrottoIvCache = Gen5WildIvCache;
export type Gen5HiddenGrottoShaCache = Gen5WildShaCache;
export const parseGen5HiddenGrottoIvCache = parseGen5WildIvCache;
export const parseGen5HiddenGrottoShaCache = parseGen5WildShaCache;

const BASE_DATE = Date.UTC(2000, 0, 1);

function dateOffset(value: string) {
  return Math.round(
    (new Date(`${value}T00:00:00.000Z`).getTime() - BASE_DATE) / 86_400_000,
  );
}

function cacheFingerprint(values?: Uint32Array) {
  if (!values) return "none";
  let forward = 0x811c_9dc5;
  let reverse = 0x9e37_79b9;
  for (let index = 0; index < values.length; index += 1) {
    forward = Math.imul(forward ^ values[index], 0x0100_0193) >>> 0;
    reverse =
      Math.imul(reverse ^ values[values.length - index - 1], 0x0100_0193) >>> 0;
  }
  return [
    values.length.toString(16),
    forward.toString(16).padStart(8, "0"),
    reverse.toString(16).padStart(8, "0"),
  ].join("-");
}

export function gen5HiddenGrottoFastSearchEligible(
  request: Gen5HiddenGrottoSearcherRequest,
  ivCache?: Gen5HiddenGrottoIvCache,
) {
  if (request.operation !== "pokemon-searcher" || !ivCache) return false;
  if (
    request.initialIvAdvances < ivCache.initialAdvances ||
    request.initialIvAdvances + request.maxIvAdvances >
      ivCache.initialAdvances + ivCache.maxAdvances
  )
    return false;
  const minimum = request.pokemonFilters.ivMin;
  return (
    minimum[0] >= 30 &&
    minimum[2] >= 30 &&
    minimum[4] >= 30 &&
    (minimum[1] >= 30 || minimum[3] >= 30) &&
    (minimum[5] >= 30 || request.pokemonFilters.ivMax[5] <= 1)
  );
}

function shaProfileCompatible(
  request: Gen5HiddenGrottoSearcherRequest,
  ivCache: Gen5HiddenGrottoIvCache,
  shaCache: Gen5HiddenGrottoShaCache,
) {
  const profile = request.profile;
  const game =
    1 << (["black", "white", "black2", "white2"].indexOf(profile.version) + 12);
  const language = [
    "english",
    "french",
    "german",
    "italian",
    "japanese",
    "korean",
    "spanish",
  ].indexOf(profile.language);
  const dsType = ["ds", "dsi", "3ds"].indexOf(profile.dsType);
  return (
    shaCache.initialAdvances === ivCache.initialAdvances &&
    shaCache.maxAdvances === ivCache.maxAdvances &&
    BigInt(`0x${shaCache.mac || "0"}`) === BigInt(`0x${profile.mac || "0"}`) &&
    shaCache.version === game &&
    shaCache.timer0Min === profile.timer0Min &&
    shaCache.timer0Max === profile.timer0Max &&
    shaCache.dsType === dsType &&
    shaCache.language === language &&
    shaCache.gxstat === profile.gxstat &&
    shaCache.vcount === profile.vcount &&
    shaCache.vframe === profile.vframe &&
    request.startDate >= shaCache.startDate &&
    request.endDate <= shaCache.endDate
  );
}

export function prepareGen5HiddenGrottoCache(
  request: Gen5HiddenGrottoSearcherRequest,
  ivCache?: Gen5HiddenGrottoIvCache,
  shaCache?: Gen5HiddenGrottoShaCache,
): Gen5HiddenGrottoPreparedCache | undefined {
  if (!gen5HiddenGrottoFastSearchEligible(request, ivCache) || !ivCache)
    return undefined;
  const pairs: number[] = [];
  const seedSet = new Set<number>();
  for (
    let advance = request.initialIvAdvances;
    advance <= request.initialIvAdvances + request.maxIvAdvances;
    advance += 1
  ) {
    for (const seed of ivCache.buckets.normal[advance + 2] ?? []) {
      pairs.push(advance, seed);
      seedSet.add(seed);
    }
  }
  if (pairs.length === 0) return undefined;
  const ivEntries = new Uint32Array(pairs);
  let shaEntries: Uint32Array | undefined;
  if (shaCache && shaProfileCompatible(request, ivCache, shaCache)) {
    const start = dateOffset(request.startDate);
    const end = dateOffset(request.endDate);
    const selected: number[] = [];
    for (let offset = 0; offset < shaCache.entries.normal.length; offset += 4) {
      const keyLow = shaCache.entries.normal[offset];
      const keyHigh = shaCache.entries.normal[offset + 1];
      const button = keyLow & 0xfff;
      const date = keyHigh & 0xffff;
      const seedHigh = shaCache.entries.normal[offset + 3];
      if (
        date >= start &&
        date <= end &&
        seedSet.has(seedHigh) &&
        isGen5HiddenGrottoButtonMaskAllowed(request.profile, button)
      ) {
        selected.push(
          keyLow,
          keyHigh,
          shaCache.entries.normal[offset + 2],
          seedHigh,
        );
      }
    }
    if (selected.length !== 0) shaEntries = new Uint32Array(selected);
  }
  const mode = shaEntries ? "iv-sha" : "iv";
  return {
    descriptor: {
      key: [
        ivCache.identity,
        ivCache.name,
        ivCache.seedCount,
        shaCache?.identity ?? 0,
        shaCache?.name ?? "",
        request.initialIvAdvances,
        request.maxIvAdvances,
        request.startDate,
        request.endDate,
        mode,
        cacheFingerprint(ivEntries),
        cacheFingerprint(shaEntries),
      ].join(":"),
      mode,
      ivEntryCount: ivEntries.length / 2,
      shaEntryCount: shaEntries ? shaEntries.length / 4 : 0,
    },
    ivEntries,
    shaEntries,
  };
}

export function withGen5HiddenGrottoCache(
  request: Gen5HiddenGrottoSearcherRequest,
  cache?: Gen5HiddenGrottoPreparedCache,
): Gen5HiddenGrottoSearcherRequest {
  return { ...request, cache: cache?.descriptor ?? null };
}
