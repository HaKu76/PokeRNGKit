import type {
  Gen5DsType,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";
import {
  GEN5_HIDDEN_GROTTO_AREAS,
  getGen5HiddenGrottoAllowedGenders,
  type Gen5HiddenGrottoArea,
} from "./encounters";

export const GEN5_HIDDEN_GROTTO_API_VERSION = 1;
export const GEN5_HIDDEN_GROTTO_MAX_RESULTS = 100_000;
export const GEN5_HIDDEN_GROTTO_MAX_EVALUATIONS = 250_000_000n;

export type Gen5HiddenGrottoOperation =
  "slot-generator" | "slot-searcher" | "pokemon-generator" | "pokemon-searcher";
export type Gen5HiddenGrottoIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen5HiddenGrottoLead =
  { type: "none" } | { type: "synchronize"; nature: number };
export type Gen5HiddenGrottoPower =
  "none" | "level1" | "level2" | "level3" | "levelS";

export interface Gen5HiddenGrottoCacheDescriptor {
  key: string;
  mode: "iv" | "iv-sha";
  ivEntryCount: number;
  shaEntryCount: number;
}

export interface Gen5HiddenGrottoPreparedCache {
  descriptor: Gen5HiddenGrottoCacheDescriptor;
  ivEntries: Uint32Array;
  shaEntries?: Uint32Array;
}

export interface Gen5HiddenGrottoProfile {
  version: "black2" | "white2";
  language: Gen5Language;
  dsType: Gen5DsType;
  tid: number;
  sid: number;
  mac: string;
  vcount: number;
  timer0Min: number;
  timer0Max: number;
  gxstat: number;
  vframe: number;
  keypresses: Gen5Profile["keypresses"];
  skipLR: boolean;
  memoryLink: boolean;
  shinyCharm: boolean;
}

export interface Gen5HiddenGrottoSlotFilters {
  slotMask: number;
  genderMask: number;
  groupMask: number;
}

export interface Gen5HiddenGrottoPokemonFilters {
  disabled: boolean;
  ivMin: Gen5HiddenGrottoIvTuple;
  ivMax: Gen5HiddenGrottoIvTuple;
  natureMask: number;
  hiddenPowerMask: number;
  levelMin: number;
  levelMax: number;
}

interface Gen5HiddenGrottoRequestBase {
  operation: Gen5HiddenGrottoOperation;
  profile: Gen5HiddenGrottoProfile;
  area: Gen5HiddenGrottoArea;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
  initialIvAdvances: number;
  maxIvAdvances: number;
  lead: Gen5HiddenGrottoLead;
  grottoPower: Gen5HiddenGrottoPower;
  selectedGroup: number;
  selectedSlot: number;
  gender: 0 | 1 | 2;
  slotFilters: Gen5HiddenGrottoSlotFilters;
  pokemonFilters: Gen5HiddenGrottoPokemonFilters;
  resultLimit: number;
  cache: Gen5HiddenGrottoCacheDescriptor | null;
}

export interface Gen5HiddenGrottoGeneratorRequest extends Gen5HiddenGrottoRequestBase {
  operation: "slot-generator" | "pokemon-generator";
  seed: string;
}

export interface Gen5HiddenGrottoSearcherRequest extends Gen5HiddenGrottoRequestBase {
  operation: "slot-searcher" | "pokemon-searcher";
  startDate: string;
  endDate: string;
}

export type Gen5HiddenGrottoRequest =
  Gen5HiddenGrottoGeneratorRequest | Gen5HiddenGrottoSearcherRequest;

export interface Gen5HiddenGrottoChunk {
  index: number;
  start: number;
  count: number;
}

interface Gen5HiddenGrottoResultBase {
  seed: string;
  advances: number;
  dateTime?: string;
  timer0?: number;
  buttonMask?: number;
}

export interface Gen5HiddenGrottoSlotResult extends Gen5HiddenGrottoResultBase {
  kind: "slot";
  chatot: number;
  needle: number;
  group: number;
  slot: number;
  item: boolean;
  data: number;
  gender: 0 | 1;
}

export interface Gen5HiddenGrottoPokemonResult extends Gen5HiddenGrottoResultBase {
  kind: "pokemon";
  ivAdvances: number;
  chatot: number;
  needle: number;
  level: number;
  species: number;
  form: number;
  pid: string;
  shiny: 0;
  nature: number;
  ability: 0 | 1 | 2;
  abilityIndex: number;
  ivs: Gen5HiddenGrottoIvTuple;
  stats: Gen5HiddenGrottoIvTuple;
  hiddenPower: number;
  hiddenPowerStrength: number;
  gender: 0 | 1 | 2;
  characteristic: number;
}

export type Gen5HiddenGrottoResult =
  Gen5HiddenGrottoSlotResult | Gen5HiddenGrottoPokemonResult;

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;
const MT_SEED_SPACE = 0x1_0000_0000n;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function parseDate(value: string) {
  const match = ISO_DATE.exec(value);
  if (!match) throw new TypeError("Date must use YYYY-MM-DD.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    year > 2099 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(
      "Date must be valid and between 2000-01-01 and 2099-12-31.",
    );
  }
  return date;
}

function popcount(value: number) {
  let bits = value;
  let count = 0;
  while (bits !== 0) {
    count += bits & 1;
    bits >>>= 1;
  }
  return count;
}

function validButtonMask(mask: number, skipLR: boolean) {
  if (skipLR && (mask & 0x3) !== 0) return false;
  if (
    (mask & 0xc00) === 0xc00 ||
    (mask & 0x300) === 0x300 ||
    (mask & 0xc3) === 0xc3
  )
    return false;
  return true;
}

export function isGen5HiddenGrottoButtonMaskAllowed(
  profile: Gen5HiddenGrottoProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5HiddenGrottoKeypresses(
  profile: Gen5HiddenGrottoProfile,
) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5HiddenGrottoButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5HiddenGrottoProfile(
  profile: Gen5Profile,
): Gen5HiddenGrottoProfile {
  if (profile.version !== "black2" && profile.version !== "white2") {
    throw new TypeError("Hidden Grotto requires a Black 2 or White 2 profile.");
  }
  return {
    version: profile.version,
    language: profile.language,
    dsType: profile.dsType,
    tid: profile.tid,
    sid: profile.sid,
    mac: profile.mac,
    vcount: profile.vcount,
    timer0Min: profile.timer0Min,
    timer0Max: profile.timer0Max,
    gxstat: profile.gxstat,
    vframe: profile.vframe,
    keypresses: [...profile.keypresses] as Gen5Profile["keypresses"],
    skipLR: profile.skipLR,
    memoryLink: profile.memoryLink,
    shinyCharm: profile.shinyCharm,
  };
}

function validateProfile(
  profile: Gen5HiddenGrottoProfile,
  requireKeypress: boolean,
) {
  if (profile.version !== "black2" && profile.version !== "white2")
    throw new TypeError("Hidden Grotto requires Black 2 or White 2.");
  if (
    !(
      "english spanish french italian german japanese korean".split(
        " ",
      ) as Gen5Language[]
    ).includes(profile.language)
  )
    throw new TypeError("Invalid Gen 5 language.");
  if (!("ds dsi 3ds".split(" ") as Gen5DsType[]).includes(profile.dsType))
    throw new TypeError("Invalid DS type.");
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
  if (!HEX_12.test(profile.mac))
    throw new TypeError("MAC must contain at most 12 hexadecimal digits.");
  if (!integerIn(profile.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !integerIn(profile.timer0Min, 0, 0xffff) ||
    !integerIn(profile.timer0Max, 0, 0xffff) ||
    profile.timer0Min > profile.timer0Max
  )
    throw new TypeError("Timer0 Min must not exceed Timer0 Max.");
  if (!integerIn(profile.gxstat, 0, 99) || !integerIn(profile.vframe, 0, 99))
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  if (
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean") ||
    (requireKeypress && countGen5HiddenGrottoKeypresses(profile) === 0)
  )
    throw new TypeError(
      "Profile must allow at least one valid Keypresses combination.",
    );
}

function validateArea(area: Gen5HiddenGrottoArea) {
  const expected = GEN5_HIDDEN_GROTTO_AREAS.find(
    (entry) => entry.location === area.location,
  );
  if (
    !expected ||
    area.pokemon.length !== 12 ||
    area.items.length !== 16 ||
    area.hiddenItems.length !== 16 ||
    expected.pokemon.some((slot, index) => {
      const actual = area.pokemon[index];
      return (
        !actual ||
        actual.species !== slot.species ||
        actual.form !== slot.form ||
        actual.genderThreshold !== slot.genderThreshold ||
        actual.minLevel !== slot.minLevel ||
        actual.maxLevel !== slot.maxLevel
      );
    }) ||
    expected.items.some((item, index) => item !== area.items[index]) ||
    expected.hiddenItems.some((item, index) => item !== area.hiddenItems[index])
  ) {
    throw new TypeError("Invalid Gen 5 Hidden Grotto encounter area.");
  }
}

function validatePokemonFilters(filters: Gen5HiddenGrottoPokemonFilters) {
  if (
    typeof filters.disabled !== "boolean" ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  )
    throw new TypeError("Pokemon filters require six IV values.");
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(maximum, 0, 31) ||
      minimum > maximum
    )
      throw new TypeError("Each IV range must be between 0 and 31.");
  });
  if (
    !integerIn(filters.natureMask, 0, ALL_NATURES) ||
    !integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS) ||
    !integerIn(filters.levelMin, 1, 100) ||
    !integerIn(filters.levelMax, filters.levelMin, 100)
  )
    throw new TypeError("Invalid Pokemon range filter.");
}

export function gen5HiddenGrottoLeadValue(lead: Gen5HiddenGrottoLead) {
  if (lead.type === "none") return 255;
  if (!integerIn(lead.nature, 0, 24))
    throw new TypeError("Synchronize Nature must be between 0 and 24.");
  return lead.nature;
}

export function gen5HiddenGrottoPowerValue(power: Gen5HiddenGrottoPower) {
  return { none: 0, level1: 1, level2: 2, level3: 3, levelS: 4 }[power];
}

export function isGen5HiddenGrottoSearcher(
  request: Gen5HiddenGrottoRequest,
): request is Gen5HiddenGrottoSearcherRequest {
  return "startDate" in request;
}

export function isGen5HiddenGrottoPokemon(request: Gen5HiddenGrottoRequest) {
  return request.operation.startsWith("pokemon");
}

export function gen5HiddenGrottoSearcherSeedCount(
  request: Gen5HiddenGrottoSearcherRequest,
) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return 0n;
  const days = BigInt(
    Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  const timer0Count = BigInt(
    request.profile.timer0Max - request.profile.timer0Min + 1,
  );
  return (
    days *
    timer0Count *
    BigInt(countGen5HiddenGrottoKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5HiddenGrottoTaskCount(request: Gen5HiddenGrottoRequest) {
  if (!isGen5HiddenGrottoSearcher(request))
    return BigInt(request.maxAdvances) + 1n;
  if (
    request.operation === "pokemon-searcher" &&
    request.cache?.mode === "iv-sha"
  )
    return BigInt(request.cache.shaEntryCount);
  return gen5HiddenGrottoSearcherSeedCount(request);
}

export function gen5HiddenGrottoEvaluationCount(
  request: Gen5HiddenGrottoRequest,
) {
  if (!isGen5HiddenGrottoSearcher(request))
    return BigInt(request.maxAdvances) + 1n;
  const rawSeeds = gen5HiddenGrottoSearcherSeedCount(request);
  const pidCount = BigInt(request.maxAdvances) + 1n;
  if (request.operation === "slot-searcher") return rawSeeds * pidCount;
  if (request.cache?.mode === "iv-sha")
    return BigInt(request.cache.shaEntryCount) * pidCount;
  const ivCount = BigInt(request.maxIvAdvances) + 1n;
  if (request.cache?.mode === "iv") {
    const expectedMatches =
      (rawSeeds * BigInt(request.cache.ivEntryCount) + MT_SEED_SPACE - 1n) /
      MT_SEED_SPACE;
    return rawSeeds + expectedMatches * pidCount;
  }
  return rawSeeds * ivCount * (pidCount + 1n);
}

export function validateGen5HiddenGrottoRequest(
  request: Gen5HiddenGrottoRequest,
) {
  if (
    ![
      "slot-generator",
      "slot-searcher",
      "pokemon-generator",
      "pokemon-searcher",
    ].includes(request.operation)
  )
    throw new TypeError("Invalid Gen 5 Hidden Grotto operation.");
  const searcher = isGen5HiddenGrottoSearcher(request);
  const pokemon = isGen5HiddenGrottoPokemon(request);
  validateProfile(request.profile, searcher);
  validateArea(request.area);
  validatePokemonFilters(request.pokemonFilters);
  gen5HiddenGrottoLeadValue(request.lead);
  gen5HiddenGrottoPowerValue(request.grottoPower);
  for (const [name, value] of [
    ["Initial Advances", request.initialAdvances],
    ["Max Advances", request.maxAdvances],
    ["Offset", request.offset],
    ["Initial IV Advances", request.initialIvAdvances],
    ["Max IV Advances", request.maxIvAdvances],
  ] as const) {
    if (!integerIn(value, 0, 0xffff_ffff))
      throw new TypeError(`${name} must be between 0 and 4294967295.`);
  }
  if (
    !integerIn(request.slotFilters.slotMask, 0, 0x7ff) ||
    !integerIn(request.slotFilters.genderMask, 0, 0x3) ||
    !integerIn(request.slotFilters.groupMask, 0, 0xf)
  )
    throw new TypeError("Invalid Hidden Grotto slot filter.");
  if (
    !integerIn(request.selectedGroup, 0, 3) ||
    !integerIn(request.selectedSlot, 0, 2) ||
    ![0, 1, 2].includes(request.gender)
  )
    throw new TypeError("Invalid Hidden Grotto Pokemon selection.");
  const selected =
    request.area.pokemon[request.selectedGroup * 3 + request.selectedSlot];
  if (!selected)
    throw new TypeError("Selected Hidden Grotto Pokemon is unavailable.");
  if (
    !getGen5HiddenGrottoAllowedGenders(selected).some(
      (gender) => gender === request.gender,
    )
  )
    throw new TypeError(
      "Selected Hidden Grotto Pokemon does not allow this gender.",
    );
  if (!integerIn(request.resultLimit, 1, GEN5_HIDDEN_GROTTO_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  if (
    request.cache !== null &&
    (typeof request.cache.key !== "string" ||
      request.cache.key.length === 0 ||
      request.cache.key.length > 512 ||
      (request.cache.mode !== "iv" && request.cache.mode !== "iv-sha") ||
      !integerIn(request.cache.ivEntryCount, 1, 1_000_000) ||
      !integerIn(request.cache.shaEntryCount, 0, 1_000_000) ||
      (request.cache.mode === "iv-sha" && request.cache.shaEntryCount < 1))
  )
    throw new TypeError("Invalid Gen 5 Hidden Grotto cache descriptor.");
  if (!searcher) {
    const normalized = request.seed.toUpperCase().padStart(16, "0");
    if (!HEX_16.test(normalized))
      throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
    if (request.cache !== null)
      throw new TypeError("Generator does not use search caches.");
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (request.offset !== 0) throw new TypeError("Searcher Offset must be 0.");
  }
  if (!pokemon) {
    if (
      request.initialIvAdvances !== 0 ||
      request.maxIvAdvances !== 0 ||
      request.cache !== null ||
      request.pokemonFilters.disabled
    )
      throw new TypeError("Slot operations do not use Pokemon IV settings.");
  } else {
    if (!searcher && request.maxIvAdvances !== 0)
      throw new TypeError("Pokemon Generator uses one IV Advances value.");
    if (searcher && request.pokemonFilters.disabled)
      throw new TypeError("Pokemon Searcher filters cannot be disabled.");
  }
  if (
    gen5HiddenGrottoEvaluationCount(request) >
    GEN5_HIDDEN_GROTTO_MAX_EVALUATIONS
  )
    throw new TypeError(
      "Gen 5 Hidden Grotto range exceeds the browser task limit.",
    );
  return request;
}

export function splitGen5HiddenGrottoRequest(
  request: Gen5HiddenGrottoRequest,
  workers: number,
) {
  validateGen5HiddenGrottoRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const total = gen5HiddenGrottoTaskCount(request);
  if (total === 0n) return [];
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Gen 5 Hidden Grotto task cannot be indexed safely.");
  const count = Number(total);
  const evaluationsPerUnit = Number(
    gen5HiddenGrottoEvaluationCount(request) / total,
  );
  const responsiveUnits = Math.max(
    1,
    Math.floor(500_000 / Math.max(1, evaluationsPerUnit)),
  );
  const chunkCount = Math.min(
    count,
    Math.max(workers * 4, Math.ceil(count / responsiveUnits)),
  );
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen5HiddenGrottoChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const size = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: size });
    start += size;
  }
  return chunks;
}

function hiddenPower(ivs: Gen5HiddenGrottoIvTuple) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  let typeBits = 0;
  let powerBits = 0;
  order.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >>> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    power: 30 + Math.floor((powerBits * 40) / 63),
  };
}

export function gen5HiddenGrottoCharacteristic(
  pid: number,
  ivs: Gen5HiddenGrottoIvTuple,
) {
  const order = [0, 1, 2, 5, 3, 4] as const;
  const start = pid % 6;
  let selected = start;
  let maximum = 0;
  for (let offset = 0; offset < 6; offset += 1) {
    const index = (start + offset) % 6;
    if (ivs[order[index]] > maximum) {
      selected = index;
      maximum = ivs[order[index]];
    }
  }
  return selected * 5 + (maximum % 5);
}

function validateSearchMetadata(
  request: Gen5HiddenGrottoSearcherRequest,
  result: Gen5HiddenGrottoResult,
) {
  const match = result.dateTime ? ISO_DATE_TIME.exec(result.dateTime) : null;
  if (!match || result.timer0 === undefined || result.buttonMask === undefined)
    throw new TypeError(
      "Gen 5 Hidden Grotto search result is missing profile metadata.",
    );
  const date = parseDate(match[1]);
  if (
    date < parseDate(request.startDate) ||
    date > parseDate(request.endDate) ||
    Number(match[2]) > 23 ||
    Number(match[3]) > 59 ||
    Number(match[4]) > 59 ||
    !integerIn(
      result.timer0,
      request.profile.timer0Min,
      request.profile.timer0Max,
    ) ||
    !isGen5HiddenGrottoButtonMaskAllowed(request.profile, result.buttonMask)
  )
    throw new TypeError(
      "Gen 5 Hidden Grotto search result contains invalid profile metadata.",
    );
}

function uint32RangeContains(
  value: number,
  start: number,
  maximumOffset: number,
) {
  return (
    integerIn(value, 0, 0xffff_ffff) && (value - start) >>> 0 <= maximumOffset
  );
}

export function validateGen5HiddenGrottoResult(
  request: Gen5HiddenGrottoRequest,
  result: Gen5HiddenGrottoResult,
) {
  if (!HEX_16.test(result.seed) || !integerIn(result.advances, 0, 0xffff_ffff))
    throw new TypeError(
      "Gen 5 Hidden Grotto result contains an invalid Seed or Advances.",
    );
  if (result.kind === "slot") {
    const expected =
      result.slot < 3
        ? request.area.pokemon[result.group * 3 + result.slot]?.species
        : result.slot < 7
          ? request.area.items[result.group * 4 + result.slot - 3]
          : request.area.hiddenItems[result.group * 4 + result.slot - 7];
    if (
      !integerIn(result.chatot, 0, 99) ||
      !integerIn(result.needle, 0, 7) ||
      !integerIn(result.group, 0, 3) ||
      !integerIn(result.slot, 0, 10) ||
      !integerIn(result.gender, 0, 1) ||
      !integerIn(result.data, 1, 0xffff) ||
      result.item !== result.slot >= 3 ||
      expected !== result.data ||
      (request.slotFilters.slotMask !== 0 &&
        (request.slotFilters.slotMask & (1 << result.slot)) === 0) ||
      (request.slotFilters.groupMask !== 0 &&
        (request.slotFilters.groupMask & (1 << result.group)) === 0) ||
      (!result.item &&
        request.slotFilters.genderMask !== 0 &&
        (request.slotFilters.genderMask & (1 << result.gender)) === 0)
    )
      throw new TypeError(
        "Gen 5 Hidden Grotto slot result contains invalid state values.",
      );
  } else {
    const selected =
      request.area.pokemon[request.selectedGroup * 3 + request.selectedSlot];
    const pid = Number.parseInt(result.pid, 16) >>> 0;
    if (
      !/^[0-9A-F]{8}$/.test(result.pid) ||
      !uint32RangeContains(
        result.ivAdvances,
        request.initialIvAdvances,
        request.maxIvAdvances,
      ) ||
      !integerIn(result.chatot, 0, 99) ||
      !integerIn(result.needle, 0, 7) ||
      !integerIn(result.level, selected.minLevel, selected.maxLevel) ||
      result.species !== selected.species ||
      result.form !== selected.form ||
      result.shiny !== 0 ||
      !integerIn(result.nature, 0, 24) ||
      !integerIn(result.ability, 0, 2) ||
      !integerIn(result.abilityIndex, 1, 0xffff) ||
      result.gender !== request.gender ||
      !integerIn(result.hiddenPower, 0, 15) ||
      !integerIn(result.hiddenPowerStrength, 30, 70) ||
      !integerIn(result.characteristic, 0, 29) ||
      result.ivs.length !== 6 ||
      !result.ivs.every((value) => integerIn(value, 0, 31)) ||
      result.stats.length !== 6 ||
      !result.stats.every((value) => integerIn(value, 1, 0xffff))
    )
      throw new TypeError(
        "Gen 5 Hidden Grotto Pokemon result contains invalid state values.",
      );
    const expected = hiddenPower(result.ivs);
    if (
      result.hiddenPower !== expected.type ||
      result.hiddenPowerStrength !== expected.power ||
      result.characteristic !== gen5HiddenGrottoCharacteristic(pid, result.ivs)
    )
      throw new TypeError(
        "Gen 5 Hidden Grotto Pokemon result contains inconsistent derived values.",
      );
    if (!request.pokemonFilters.disabled) {
      if (
        result.ivs.some(
          (value, index) =>
            value < request.pokemonFilters.ivMin[index] ||
            value > request.pokemonFilters.ivMax[index],
        ) ||
        (request.pokemonFilters.natureMask !== 0 &&
          (request.pokemonFilters.natureMask & (1 << result.nature)) === 0) ||
        (request.pokemonFilters.hiddenPowerMask !== 0 &&
          (request.pokemonFilters.hiddenPowerMask &
            (1 << result.hiddenPower)) ===
            0) ||
        result.level < request.pokemonFilters.levelMin ||
        result.level > request.pokemonFilters.levelMax
      )
        throw new TypeError(
          "Gen 5 Hidden Grotto Pokemon result does not match the request filters.",
        );
    }
  }
  if (isGen5HiddenGrottoSearcher(request))
    validateSearchMetadata(request, result);
  return result;
}

export function formatGen5HiddenGrottoButtons(mask: number) {
  if (mask === 0) return "None";
  const labels = [
    "R",
    "L",
    "X",
    "Y",
    "A",
    "B",
    "Select",
    "Start",
    "Right",
    "Left",
    "Up",
    "Down",
  ];
  return labels.filter((_, index) => (mask & (1 << index)) !== 0).join(" + ");
}

export function normalizeGen5HiddenGrottoSeed(value: string) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}
