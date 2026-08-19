import {
  GEN7_STATIONARY_NATURES,
  GEN7_STATIONARY_SPECIES,
  GEN7_STATIONARY_TEMPLATES,
  type Gen7StationaryGameVersion,
  type Gen7StationaryTemplate,
} from "./data";

export const GEN7_STATIONARY_API_VERSION = 1;
export const GEN7_STATIONARY_REQUEST_WORDS = 57;
export const GEN7_STATIONARY_RESULT_WORDS = 9;
export const GEN7_STATIONARY_STEP_SIZE = 2_048;
export const GEN7_STATIONARY_MAX_RESULTS = 100_000;
export const GEN7_STATIONARY_MAX_FRAME = 1_000_000_000;
export const GEN7_STATIONARY_BROWSER_MAX_FRAME = 5_000_000;
export const GEN7_STATIONARY_PELAGO_MAX_SHIFT = 255;
export const GEN7_TIMEFINDER_API_VERSION = 1;
export const GEN7_TIMEFINDER_MIN_EPOCH = 0;
export const GEN7_TIMEFINDER_DEFAULT_TICK = 0x041d_9cb9;
export const GEN7_TIMEFINDER_DEFAULT_OFFSET = 55;
export const GEN7_TIMEFINDER_BROWSER_MAX_STATES = 5_000_000;

export type Gen7StationaryIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen7StationaryLanguage = "zh" | "en" | "ja";
export type Gen7StationaryBlinkFilter = "any" | "blink" | "safe";
export type Gen7StationaryShinyFilter = "any" | "shiny" | "square";
export type Gen7StationaryGenderFilter = "any" | "male" | "female";
export type Gen7StationaryAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen7StationaryEncounter {
  id: string;
  conceptual: boolean;
  species: number;
  form: number;
  level: number;
  gender: number;
  randomGender: boolean;
  ability: number;
  nature: number;
  ivs: Gen7StationaryIvTuple;
  npc: number;
  delay: number;
  delayType: number;
  fixedThreeIv: boolean;
  alwaysSync: boolean;
  syncable: boolean;
  shinyLocked: boolean;
  ultraWormhole: boolean;
  raining: boolean;
  pelago: boolean;
  otTsv: number | null;
  trade: boolean;
  fateful: boolean;
  postNatureLock: boolean;
}

export interface Gen7StationaryFilters {
  disabled: boolean;
  shiny: Gen7StationaryShinyFilter;
  gender: Gen7StationaryGenderFilter;
  ability: Gen7StationaryAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7StationaryIvTuple;
  ivMax: Gen7StationaryIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
  blink: Gen7StationaryBlinkFilter;
}

export interface Gen7StationaryRequest {
  version: Gen7StationaryGameVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  forcedShiny: boolean;
  syncNature: number | null;
  considerDelay: boolean;
  pelagoShift: number;
  encounter: Gen7StationaryEncounter;
  filters: Gen7StationaryFilters;
  resultLimit: number;
}

export interface Gen7StationaryResult {
  frame: number;
  realTimeFrames: number;
  random: bigint;
  ec: number;
  pid: number;
  ivs: Gen7StationaryIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  synchronize: boolean;
  blink: number;
  delay: number;
  psv: number;
  prv: number;
  /** Present only for time-search results. Epoch is milliseconds since 2000-01-01. */
  initialSeed?: number;
  epoch?: bigint;
}

export type Gen7StationaryTimeRequest = Omit<Gen7StationaryRequest, "seed"> & {
  startEpoch: bigint;
  endEpoch: bigint;
  tick: number;
  offset: number;
};

export interface Gen7StationaryTimeResult extends Gen7StationaryResult {
  initialSeed: number;
  epoch: bigint;
}

const UINT32_MAX = 0xffff_ffff;
const ALL_NATURES = 0x1ff_ffff;
const ALL_HIDDEN_POWERS = 0xffff;
const HIDDEN_POWER_ORDER = [0, 1, 2, 4, 5, 3] as const;
const SUPPORTED_GENDER_VALUES = new Set([0, 1, 2, 30, 62, 126, 190, 224]);

export const GEN7_STATIONARY_GENDER_RATIOS = [
  { value: 0xff, setting: 0, random: false, label: "Genderless" },
  { value: 0x00, setting: 1, random: false, label: "Male" },
  { value: 0xfe, setting: 2, random: false, label: "Female" },
  { value: 0x1f, setting: 30, random: true, label: "87.5% Male" },
  { value: 0x3f, setting: 62, random: true, label: "75% Male" },
  { value: 0x7f, setting: 126, random: true, label: "50% Male" },
  { value: 0xbf, setting: 190, random: true, label: "25% Male" },
  { value: 0xe1, setting: 224, random: true, label: "12.5% Male" },
] as const;

function integerIn(value: unknown, minimum: number, maximum: number) {
  return (
    Number.isInteger(value) &&
    Number(value) >= minimum &&
    Number(value) <= maximum
  );
}

function boolean(value: unknown) {
  return typeof value === "boolean";
}

function sameValues(left: readonly number[], right: readonly number[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function ivTuple(values: readonly number[]): Gen7StationaryIvTuple {
  if (values.length !== 6) throw new TypeError("Six IV values are required.");
  return [...values] as Gen7StationaryIvTuple;
}

export function gen7StationaryStartingFrame(
  version: Gen7StationaryGameVersion,
) {
  return version === "sun" || version === "moon" ? 418 : 478;
}

export function gen7StationaryVersionFamily(
  version: Gen7StationaryGameVersion,
) {
  return version === "sun" || version === "moon" ? "sm" : "usum";
}

export function gen7StationaryEncounterFromTemplate(
  template: Gen7StationaryTemplate,
): Gen7StationaryEncounter {
  return {
    id: template.id,
    conceptual: template.conceptual,
    species: template.species,
    form: template.form,
    level: template.level,
    gender: template.genderSetting,
    randomGender: template.randomGender,
    ability: template.ability,
    nature: template.nature,
    ivs: ivTuple(template.ivs),
    npc: template.npc,
    delay: template.delay,
    delayType: template.delayType,
    fixedThreeIv: template.fixedThreeIv,
    alwaysSync: template.alwaysSync,
    syncable: template.syncable,
    shinyLocked: template.shinyLocked,
    ultraWormhole: template.ultraWormhole,
    raining: template.raining,
    pelago: template.pelago,
    otTsv: template.otTsv,
    trade: template.trade,
    fateful: template.fateful,
    postNatureLock: template.postNatureLock,
  };
}

export function gen7StationaryTemplateName(
  template: Gen7StationaryTemplate,
  language: Gen7StationaryLanguage,
) {
  if (template.conceptual) return "-";
  const species =
    GEN7_STATIONARY_SPECIES[language][template.species] ??
    `#${template.species}`;
  if (template.egg) {
    const egg = GEN7_STATIONARY_SPECIES[language][0] ?? "Egg";
    return `${species} (${egg})`;
  }
  if (template.unstable) return `${species} (?)`;
  if (template.species === 25 && template.gift) {
    return `${species} (${template.otTsv === null ? "Surf" : "Partner"})`;
  }
  if (template.species === 132 && template.nature < 25) {
    const nature = GEN7_STATIONARY_NATURES[language][template.nature];
    return `${species} (${nature})`;
  }
  if (template.species === 718 && (template.form === 1 || template.form === 2))
    return `${species}-10%`;
  if (template.species === 718 && template.form === 3) return `${species}-50%`;
  return template.form === 0 ? species : `${species}-${template.form}`;
}

export function parseGen7StationaryDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function parseGen7StationarySignedDecimal(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^-?\d+$/.test(normalized) ? Number(normalized) : Number.NaN;
}

export function parseGen7StationaryHex(value: string) {
  const normalized = value.trim();
  if (normalized === "") return 0;
  return /^[\da-f]+$/i.test(normalized)
    ? Number.parseInt(normalized, 16)
    : Number.NaN;
}

export function formatGen7StationaryHex32(value: number) {
  return (value >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen7StationaryHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}

export function gen7StationaryDelayTime(delay: number) {
  return Math.trunc(delay / 2) + 2;
}

export function gen7StationaryEffectiveDelayType(
  encounter: Gen7StationaryEncounter,
) {
  return encounter.delayType === 4 && Math.abs(encounter.delay % 2) === 1
    ? 6
    : encounter.delayType;
}

export function gen7StationaryEffectiveTsv(request: Gen7StationaryRequest) {
  return request.encounter.otTsv ?? request.tsv;
}

export function gen7StationaryEffectiveNature(request: Gen7StationaryRequest) {
  return request.encounter.nature < 25
    ? request.encounter.nature
    : (request.syncNature ?? 0xff);
}

function validateIvRanges(filters: Gen7StationaryFilters) {
  if (
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("IV filters require six ranges.");
  }
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !integerIn(minimum, 0, 31) ||
      !integerIn(maximum, 0, 31) ||
      minimum > maximum
    ) {
      throw new TypeError("Each IV range must be between 0 and 31.");
    }
  });
}

function validateEncounter(
  encounter: Gen7StationaryEncounter,
  version: Gen7StationaryGameVersion,
) {
  const source: Gen7StationaryTemplate | undefined =
    GEN7_STATIONARY_TEMPLATES.find((entry) => entry.id === encounter.id);
  if (!source || !source.versions.includes(version))
    throw new TypeError(
      "Encounter template does not support this game version.",
    );
  if (
    encounter.conceptual !== source.conceptual ||
    encounter.form !== source.form ||
    encounter.delayType !== source.delayType ||
    encounter.syncable !== source.syncable ||
    encounter.ultraWormhole !== source.ultraWormhole ||
    encounter.pelago !== source.pelago ||
    encounter.otTsv !== source.otTsv ||
    encounter.trade !== source.trade ||
    encounter.fateful !== source.fateful ||
    encounter.postNatureLock !== source.postNatureLock
  ) {
    throw new TypeError("Encounter template metadata was modified.");
  }
  if (
    source.conceptual
      ? encounter.nature !== source.nature ||
        !sameValues(encounter.ivs, source.ivs)
      : encounter.species !== source.species ||
        encounter.level !== source.level ||
        encounter.gender !== source.genderSetting ||
        encounter.randomGender !== source.randomGender ||
        encounter.ability !== source.ability ||
        encounter.nature !== source.nature ||
        !sameValues(encounter.ivs, source.ivs) ||
        encounter.fixedThreeIv !== source.fixedThreeIv ||
        encounter.alwaysSync !== source.alwaysSync ||
        encounter.shinyLocked !== source.shinyLocked
  ) {
    throw new TypeError("This encounter field is not editable upstream.");
  }
  if (!integerIn(encounter.species, 0, 807))
    throw new TypeError("Species must be between 0 and 807.");
  if (!integerIn(encounter.form, 0, 255))
    throw new TypeError("Form must be between 0 and 255.");
  if (!integerIn(encounter.level, 0, 100))
    throw new TypeError("Level must be between 0 and 100.");
  if (
    !SUPPORTED_GENDER_VALUES.has(encounter.gender) ||
    encounter.randomGender !== (encounter.gender > 2 && encounter.gender < 0xef)
  ) {
    throw new TypeError("Invalid Gen 7 gender ratio.");
  }
  if (!integerIn(encounter.ability, 0, 3))
    throw new TypeError("Ability must be random, 1, 2, or hidden.");
  if (!integerIn(encounter.nature, 0, 0xff))
    throw new TypeError("Encounter nature is invalid.");
  if (
    !Array.isArray(encounter.ivs) ||
    encounter.ivs.length !== 6 ||
    !encounter.ivs.every((value) => integerIn(value, -1, 31))
  ) {
    throw new TypeError("Encounter IVs must use -1 or values from 0 to 31.");
  }
  if (!integerIn(encounter.npc, 0, 100))
    throw new TypeError("NPC count must be between 0 and 100.");
  const minimumDelay = Math.min(source.delay, 0);
  if (!integerIn(encounter.delay, minimumDelay, 4_000))
    throw new TypeError(
      `Delay must be between ${minimumDelay} and 4000 for this template.`,
    );
  if (!integerIn(encounter.delayType, 0, 27))
    throw new TypeError("Delay type must be between 0 and 27.");
  if (
    !boolean(encounter.conceptual) ||
    !boolean(encounter.randomGender) ||
    !boolean(encounter.fixedThreeIv) ||
    !boolean(encounter.alwaysSync) ||
    !boolean(encounter.syncable) ||
    !boolean(encounter.shinyLocked) ||
    !boolean(encounter.ultraWormhole) ||
    !boolean(encounter.raining) ||
    !boolean(encounter.pelago) ||
    !boolean(encounter.trade) ||
    !boolean(encounter.fateful) ||
    !boolean(encounter.postNatureLock)
  ) {
    throw new TypeError("Invalid Gen 7 encounter flags.");
  }
  if (encounter.otTsv !== null && !integerIn(encounter.otTsv, 0, 4095))
    throw new TypeError("Encounter OT TSV must be between 0 and 4095.");
  if (!source.conceptual && !source.raining && encounter.raining)
    throw new TypeError("Raining is not available for this encounter.");
  if (
    encounter.fixedThreeIv &&
    encounter.ivs.filter((value) => value === -1).length < 3
  ) {
    throw new TypeError(
      "Three flawless IVs require at least three random IV slots.",
    );
  }
  if (
    encounter.trade &&
    (encounter.nature >= 25 ||
      encounter.ability === 0 ||
      encounter.randomGender)
  ) {
    throw new TypeError(
      "In-game trades require fixed nature, ability, and gender values.",
    );
  }
}

function validateFilters(
  filters: Gen7StationaryFilters,
  encounter: Gen7StationaryEncounter,
) {
  if (
    !boolean(filters.disabled) ||
    !(["any", "shiny", "square"] as string[]).includes(filters.shiny) ||
    !(["any", "male", "female"] as string[]).includes(filters.gender) ||
    !(["any", "first", "second", "hidden"] as string[]).includes(
      filters.ability,
    ) ||
    !(["any", "blink", "safe"] as string[]).includes(filters.blink)
  ) {
    throw new TypeError("Invalid Gen 7 Stationary filter choice.");
  }
  if (!integerIn(filters.natureMask, 0, ALL_NATURES))
    throw new TypeError("Nature filter mask is invalid.");
  if (!integerIn(filters.hiddenPowerMask, 0, ALL_HIDDEN_POWERS))
    throw new TypeError("Hidden Power filter mask is invalid.");
  validateIvRanges(filters);
  if (!integerIn(filters.perfectIvValue, 0, 31))
    throw new TypeError("Perfect IV value must be between 0 and 31.");
  if (!integerIn(filters.perfectIvCount, 0, 6))
    throw new TypeError("Perfect IV count must be between 0 and 6.");
  if (filters.blink === "blink" && encounter.npc !== 0)
    throw new TypeError("Blink-only filtering requires zero NPCs.");
  if (filters.blink === "safe" && encounter.npc === 0)
    throw new TypeError("Safe-frame filtering requires at least one NPC.");
}

export function gen7StationaryTaskCount(request: Gen7StationaryRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function gen7StationaryTimeTaskCount(
  request: Gen7StationaryTimeRequest,
) {
  const seconds = (request.endEpoch - request.startEpoch) / 1000n;
  const frames = BigInt(request.maxFrame - request.minFrame + 1);
  const total = (seconds + 1n) * frames;
  if (total > BigInt(Number.MAX_SAFE_INTEGER))
    throw new RangeError("Time Finder search range is too large.");
  return Number(total);
}

export function gen7StationaryTimeResultLimitReached(
  request: Gen7StationaryTimeRequest,
  epoch: bigint,
  totalResults: number,
  stationaryLimitReached: boolean,
) {
  return (
    stationaryLimitReached ||
    (totalResults >= request.resultLimit && epoch < request.endEpoch)
  );
}

export function gen7StationaryTimeEpochFromInput(
  value: string,
  offset: number,
) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    value,
  );
  if (!match) return Number.NaN;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const parts = [
    Number(yearText),
    Number(monthText),
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText ?? 0),
  ] as const;
  const milliseconds = Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5],
  );
  const normalized = new Date(milliseconds);
  if (
    normalized.getUTCFullYear() !== parts[0] ||
    normalized.getUTCMonth() !== parts[1] - 1 ||
    normalized.getUTCDate() !== parts[2] ||
    normalized.getUTCHours() !== parts[3] ||
    normalized.getUTCMinutes() !== parts[4] ||
    normalized.getUTCSeconds() !== parts[5]
  )
    return Number.NaN;
  return BigInt(milliseconds) + BigInt(offset) - 946_684_800_000n;
}

export function formatGen7StationaryTimeEpoch(epoch: bigint, offset: number) {
  const milliseconds = epoch + 946_684_800_000n - BigInt(offset);
  return new Date(Number(milliseconds))
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

export function validateGen7StationaryTimeRequest(
  request: Gen7StationaryTimeRequest,
) {
  if (
    typeof request.startEpoch !== "bigint" ||
    typeof request.endEpoch !== "bigint"
  )
    throw new TypeError("Time Finder epochs must be integers.");
  if (request.startEpoch < BigInt(GEN7_TIMEFINDER_MIN_EPOCH))
    throw new RangeError("Start date must be at least 2000-01-01.");
  if (request.endEpoch < request.startEpoch)
    throw new RangeError("End date must not be before the start date.");
  if (!integerIn(request.tick, 0, UINT32_MAX))
    throw new TypeError("Tick must be between 00000000 and FFFFFFFF.");
  if (!integerIn(request.offset, 0, UINT32_MAX))
    throw new TypeError("Offset must be between 0 and 4294967295.");
  const offset = BigInt(request.offset);
  if (
    (request.startEpoch - offset) % 1000n !== 0n ||
    (request.endEpoch - offset) % 1000n !== 0n
  )
    throw new RangeError("Time Finder dates must align to whole seconds.");
  validateGen7StationaryRequest({ ...request, seed: 0 });
  if (gen7StationaryTimeTaskCount(request) > GEN7_TIMEFINDER_BROWSER_MAX_STATES)
    throw new RangeError("Time Finder range exceeds the browser task limit.");
  return request;
}

export function validateGen7StationaryRequest(request: Gen7StationaryRequest) {
  if (
    !(["sun", "moon", "ultra-sun", "ultra-moon"] as string[]).includes(
      request.version,
    )
  ) {
    throw new TypeError("Invalid Gen 7 game version.");
  }
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("Seed must be between 00000000 and FFFFFFFF.");
  const startingFrame = gen7StationaryStartingFrame(request.version);
  if (!integerIn(request.minFrame, startingFrame, GEN7_STATIONARY_MAX_FRAME))
    throw new TypeError(`Minimum frame must be at least ${startingFrame}.`);
  if (
    !integerIn(request.maxFrame, request.minFrame, GEN7_STATIONARY_MAX_FRAME)
  ) {
    throw new TypeError("Maximum frame must not be lower than minimum frame.");
  }
  if (request.maxFrame > GEN7_STATIONARY_BROWSER_MAX_FRAME)
    throw new TypeError("Frame range exceeds the browser task limit.");
  if (!integerIn(request.tsv, 0, 4095))
    throw new TypeError("TSV must be between 0 and 4095.");
  if (!integerIn(request.trv, 0, 15))
    throw new TypeError("TRV must be between 0 and F.");
  if (
    !boolean(request.shinyCharm) ||
    !boolean(request.forcedShiny) ||
    !boolean(request.considerDelay)
  )
    throw new TypeError("Invalid Gen 7 Stationary options.");
  if (request.forcedShiny && !request.encounter.ultraWormhole)
    throw new TypeError("Forced shiny is only available in Ultra Space Wilds.");
  if (request.syncNature !== null && !integerIn(request.syncNature, 0, 24))
    throw new TypeError("Synchronize nature must be between 0 and 24.");
  if (!integerIn(request.pelagoShift, 0, GEN7_STATIONARY_PELAGO_MAX_SHIFT))
    throw new TypeError("Poke Pelago shift must be between 0 and 255.");
  validateEncounter(request.encounter, request.version);
  if (request.encounter.pelago === false && request.pelagoShift !== 0)
    throw new TypeError("Poke Pelago shift is only available in Poke Pelago.");
  if (!request.encounter.syncable && request.syncNature !== null)
    throw new TypeError("This encounter does not support Synchronize.");
  validateFilters(request.filters, request.encounter);
  if (!integerIn(request.resultLimit, 1, GEN7_STATIONARY_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

function genderFilterToWasm(filter: Gen7StationaryGenderFilter) {
  return { any: 0, male: 1, female: 2 }[filter];
}

function abilityFilterToWasm(filter: Gen7StationaryAbilityFilter) {
  return { any: 0, first: 1, second: 2, hidden: 3 }[filter];
}

function blinkFilterToWasm(filter: Gen7StationaryBlinkFilter) {
  return { any: 0, blink: 1, safe: 2 }[filter];
}

export function encodeGen7StationaryRequest(request: Gen7StationaryRequest) {
  validateGen7StationaryRequest(request);
  const encounter = request.encounter;
  const versions = { sun: 0, moon: 1, "ultra-sun": 2, "ultra-moon": 3 };
  return Uint32Array.from([
    request.seed,
    request.minFrame,
    request.maxFrame,
    versions[request.version],
    gen7StationaryEffectiveTsv(request),
    request.trv,
    request.shinyCharm ? 1 : 0,
    gen7StationaryEffectiveNature(request),
    encounter.npc,
    encounter.delay,
    gen7StationaryEffectiveDelayType(encounter),
    request.considerDelay ? 1 : 0,
    encounter.raining ? 1 : 0,
    request.pelagoShift,
    encounter.species,
    encounter.form,
    encounter.level,
    encounter.gender,
    encounter.randomGender ? 1 : 0,
    encounter.ability,
    ...encounter.ivs,
    encounter.fixedThreeIv ? 1 : 0,
    encounter.alwaysSync ? 1 : 0,
    encounter.shinyLocked ? 1 : 0,
    request.forcedShiny ? 1 : 0,
    encounter.pelago ? 1 : 0,
    encounter.trade ? 1 : 0,
    encounter.fateful ? 1 : 0,
    encounter.postNatureLock ? 1 : 0,
    request.filters.disabled ? 1 : 0,
    request.filters.shiny === "any" ? 0 : 1,
    request.filters.shiny === "square" ? 1 : 0,
    genderFilterToWasm(request.filters.gender),
    abilityFilterToWasm(request.filters.ability),
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
    blinkFilterToWasm(request.filters.blink),
    request.resultLimit,
  ]);
}

function unpackIvs(word: number): Gen7StationaryIvTuple {
  return [0, 1, 2, 3, 4, 5].map(
    (index) => (word >>> (index * 5)) & 0x1f,
  ) as Gen7StationaryIvTuple;
}

export function decodeGen7StationaryResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_STATIONARY_RESULT_WORDS !== 0)
    throw new RangeError("Invalid Gen 7 Stationary result buffer length.");
  return Array.from(
    { length: words.length / GEN7_STATIONARY_RESULT_WORDS },
    (_, index): Gen7StationaryResult => {
      const offset = index * GEN7_STATIONARY_RESULT_WORDS;
      const pid = words[offset + 5];
      const metadata = words[offset + 7];
      const xorValue = (pid >>> 16) ^ (pid & 0xffff);
      return {
        frame: words[offset],
        realTimeFrames: words[offset + 1],
        random: (BigInt(words[offset + 3]) << 32n) | BigInt(words[offset + 2]),
        ec: words[offset + 4],
        pid,
        ivs: unpackIvs(words[offset + 6]),
        nature: metadata & 0x1f,
        ability: (metadata >>> 5) & 0x3,
        gender: (metadata >>> 7) & 0x3,
        hiddenPower: (metadata >>> 9) & 0xf,
        shiny: (metadata >>> 14) & 0x1 ? 2 : (metadata >>> 13) & 0x1,
        synchronize: ((metadata >>> 15) & 0x1) === 1,
        blink: (metadata >>> 16) & 0x3f,
        delay: words[offset + 8],
        psv: xorValue >>> 4,
        prv: xorValue & 0xf,
      };
    },
  );
}

export const GEN7_STATIONARY_TIME_RESULT_WORDS = 12;

export function decodeGen7StationaryTimeResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_STATIONARY_TIME_RESULT_WORDS !== 0)
    throw new RangeError(
      "Invalid Gen 7 Stationary Time Finder result buffer length.",
    );
  const base = words.length / GEN7_STATIONARY_TIME_RESULT_WORDS;
  const results: Gen7StationaryTimeResult[] = [];
  for (let index = 0; index < base; index++) {
    const offset = index * GEN7_STATIONARY_TIME_RESULT_WORDS;
    const baseWords = new Uint32Array(9);
    baseWords.set(words.subarray(offset, offset + 9));
    const decoded = decodeGen7StationaryResults(baseWords.buffer)[0];
    results.push({
      ...decoded,
      initialSeed: words[offset + 9],
      epoch: (BigInt(words[offset + 11]) << 32n) | BigInt(words[offset + 10]),
    });
  }
  return results;
}

export function gen7StationaryHiddenPower(ivs: Gen7StationaryIvTuple) {
  const value = ivs.reduce(
    (total, iv, index) => total + ((iv & 1) << HIDDEN_POWER_ORDER[index]),
    0,
  );
  return Math.floor((15 * value) / 63);
}

export function gen7StationaryResultPassesFilters(
  request: Gen7StationaryRequest,
  result: Gen7StationaryResult,
) {
  const filters = request.filters;
  if (filters.blink === "blink" && result.blink < 4) return false;
  if (filters.blink === "safe" && result.blink >= 2) return false;
  if (filters.disabled) return true;
  if (filters.shiny === "shiny" && result.shiny === 0) return false;
  if (filters.shiny === "square" && result.shiny !== 2) return false;
  if (filters.gender === "male" && result.gender !== 1) return false;
  if (filters.gender === "female" && result.gender !== 2) return false;
  if (filters.ability === "first" && result.ability !== 1) return false;
  if (filters.ability === "second" && result.ability !== 2) return false;
  if (filters.ability === "hidden" && result.ability !== 3) return false;
  if (filters.natureMask !== 0 && !(filters.natureMask & (1 << result.nature)))
    return false;
  if (
    filters.hiddenPowerMask !== 0 &&
    !(filters.hiddenPowerMask & (1 << result.hiddenPower))
  )
    return false;
  if (
    result.ivs.some(
      (value, index) =>
        value < filters.ivMin[index] || value > filters.ivMax[index],
    )
  )
    return false;
  return (
    result.ivs.filter((value) => value >= filters.perfectIvValue).length >=
    filters.perfectIvCount
  );
}

export function validateGen7StationaryResult(
  request: Gen7StationaryRequest,
  result: Gen7StationaryResult,
) {
  if (
    !integerIn(result.frame, request.minFrame, request.maxFrame) ||
    !integerIn(result.realTimeFrames, 0, UINT32_MAX) ||
    !integerIn(result.ec, 0, UINT32_MAX) ||
    !integerIn(result.pid, 0, UINT32_MAX) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 1, 3) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.blink, 0, 63) ||
    !integerIn(result.delay, 0, UINT32_MAX) ||
    !result.ivs.every((value) => integerIn(value, 0, 31)) ||
    gen7StationaryHiddenPower(result.ivs) !== result.hiddenPower ||
    !gen7StationaryResultPassesFilters(request, result)
  ) {
    throw new TypeError("Gen 7 Stationary result contains invalid values.");
  }
  return result;
}
