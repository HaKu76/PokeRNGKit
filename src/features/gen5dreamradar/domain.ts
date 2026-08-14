import type {
  Gen5DsType,
  Gen5Language,
  Gen5Profile,
} from "../gen5profiles/domain";

export const GEN5_DREAM_RADAR_MAX_RESULTS = 100_000;
export const GEN5_DREAM_RADAR_MAX_EVALUATIONS = 250_000_000n;
export const GEN5_DREAM_RADAR_API_VERSION = 1;

export type Gen5DreamRadarMode = "generator" | "searcher";
export type Gen5DreamRadarIvTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type Gen5DreamRadarGender = 0 | 1 | 2;

export interface Gen5DreamRadarEncounter {
  species: number;
  form: number;
  ability: 2 | 255;
  templateGender: 0 | 255;
  personalGender: number;
  genie: boolean;
  legend: boolean;
}

export const GEN5_DREAM_RADAR_ENCOUNTERS = [
  {
    species: 79,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 120,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 255,
  },
  {
    species: 137,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 255,
  },
  {
    species: 163,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 174,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 191,
  },
  {
    species: 175,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 31,
  },
  {
    species: 213,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 238,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 254,
  },
  { species: 249, form: 0, ability: 2, templateGender: 0, personalGender: 255 },
  { species: 250, form: 0, ability: 2, templateGender: 0, personalGender: 255 },
  {
    species: 280,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 333,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 374,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 255,
  },
  {
    species: 425,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 436,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 255,
  },
  {
    species: 442,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 447,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 31,
  },
  {
    species: 479,
    form: 0,
    ability: 255,
    templateGender: 255,
    personalGender: 255,
  },
  { species: 483, form: 0, ability: 2, templateGender: 0, personalGender: 255 },
  { species: 484, form: 0, ability: 2, templateGender: 0, personalGender: 255 },
  { species: 487, form: 0, ability: 2, templateGender: 0, personalGender: 255 },
  {
    species: 517,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  {
    species: 561,
    form: 0,
    ability: 2,
    templateGender: 255,
    personalGender: 127,
  },
  { species: 641, form: 1, ability: 2, templateGender: 0, personalGender: 0 },
  { species: 642, form: 1, ability: 2, templateGender: 0, personalGender: 0 },
  { species: 645, form: 1, ability: 2, templateGender: 0, personalGender: 0 },
].map((encounter) => ({
  ...encounter,
  genie:
    encounter.species === 641 ||
    encounter.species === 642 ||
    encounter.species === 645,
  legend: [249, 250, 483, 484, 487, 641, 642, 645].includes(encounter.species),
})) as readonly Gen5DreamRadarEncounter[];

export const GEN5_DREAM_RADAR_ABILITIES = [
  [12, 20, 144],
  [35, 30, 148],
  [36, 88, 148],
  [15, 51, 110],
  [56, 56, 132],
  [55, 32, 105],
  [5, 82, 126],
  [12, 108, 93],
  [46, 46, 136],
  [46, 46, 144],
  [28, 36, 140],
  [30, 30, 13],
  [29, 29, 135],
  [106, 84, 138],
  [26, 85, 134],
  [46, 46, 151],
  [80, 39, 158],
  [26, 26, 26],
  [46, 46, 140],
  [46, 46, 140],
  [46, 46, 140],
  [108, 28, 140],
  [147, 98, 110],
  [144, 144, 144],
  [10, 10, 10],
  [22, 22, 22],
] as const;

export interface Gen5DreamRadarSlot {
  encounter: number;
  gender: Gen5DreamRadarGender;
}

export interface Gen5DreamRadarFilters {
  disabled: boolean;
  ivMin: Gen5DreamRadarIvTuple;
  ivMax: Gen5DreamRadarIvTuple;
  natureMask: number;
  hiddenPowerMask: number;
}

export interface Gen5DreamRadarProfile {
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
}

interface Gen5DreamRadarRequestBase {
  mode: Gen5DreamRadarMode;
  profile: Gen5DreamRadarProfile;
  initialAdvances: number;
  maxAdvances: number;
  badges: number;
  slots: Gen5DreamRadarSlot[];
  filters: Gen5DreamRadarFilters;
  resultLimit: number;
}

export interface Gen5DreamRadarGeneratorRequest extends Gen5DreamRadarRequestBase {
  mode: "generator";
  seed: string;
}

export interface Gen5DreamRadarSearcherRequest extends Gen5DreamRadarRequestBase {
  mode: "searcher";
  startDate: string;
  endDate: string;
}

export type Gen5DreamRadarRequest =
  Gen5DreamRadarGeneratorRequest | Gen5DreamRadarSearcherRequest;

export interface Gen5DreamRadarChunk {
  index: number;
  start: number;
  count: number;
}

export interface Gen5DreamRadarResult {
  seed: string;
  advances: number;
  needle: number;
  pid: string;
  ability: number;
  abilityIndex: number;
  ivs: Gen5DreamRadarIvTuple;
  level: number;
  nature: number;
  gender: Gen5DreamRadarGender;
  hiddenPower: number;
  hiddenPowerStrength: number;
  characteristic: number;
  dateTime?: string;
  timer0?: number;
  buttonMask?: number;
}

const HEX_12 = /^[0-9a-fA-F]{0,12}$/;
const HEX_16 = /^[0-9A-F]{16}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const DAY_MS = 86_400_000;
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
  if ((mask & 0xc00) === 0xc00) return false;
  if ((mask & 0x300) === 0x300) return false;
  if ((mask & 0xc3) === 0xc3) return false;
  return true;
}

export function isGen5DreamRadarButtonMaskAllowed(
  profile: Gen5DreamRadarProfile,
  mask: number,
) {
  return (
    integerIn(mask, 0, 0xfff) &&
    profile.keypresses[popcount(mask)] === true &&
    validButtonMask(mask, profile.skipLR)
  );
}

export function countGen5DreamRadarKeypresses(profile: Gen5DreamRadarProfile) {
  let count = 0;
  for (let mask = 0; mask < 0x1000; mask += 1) {
    if (isGen5DreamRadarButtonMaskAllowed(profile, mask)) count += 1;
  }
  return count;
}

export function gen5DreamRadarProfile(
  profile: Gen5Profile,
): Gen5DreamRadarProfile {
  if (profile.version !== "black2" && profile.version !== "white2") {
    throw new TypeError("Dream Radar requires a Black 2 or White 2 profile.");
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
  };
}

export function allowedGen5DreamRadarGenders(encounterIndex: number) {
  const encounter = GEN5_DREAM_RADAR_ENCOUNTERS[encounterIndex];
  if (!encounter) return [];
  if (encounter.templateGender !== 255)
    return [encounter.genie ? 0 : 2] as Gen5DreamRadarGender[];
  if (encounter.personalGender === 255) return [2] as Gen5DreamRadarGender[];
  if (encounter.personalGender === 254) return [1] as Gen5DreamRadarGender[];
  if (encounter.personalGender === 0) return [0] as Gen5DreamRadarGender[];
  return [0, 1] as Gen5DreamRadarGender[];
}

function validateProfile(profile: Gen5DreamRadarProfile) {
  if (profile.version !== "black2" && profile.version !== "white2")
    throw new TypeError("Dream Radar requires a Black 2 or White 2 profile.");
  if (
    !(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const
    ).includes(profile.language) ||
    !(["ds", "dsi", "3ds"] as const).includes(profile.dsType)
  ) {
    throw new TypeError("Invalid Gen 5 profile platform.");
  }
  if (!integerIn(profile.tid, 0, 0xffff) || !integerIn(profile.sid, 0, 0xffff))
    throw new TypeError("TID and SID must be between 0 and 65535.");
  if (!HEX_12.test(profile.mac))
    throw new TypeError("MAC must contain at most 12 hexadecimal digits.");
  if (!integerIn(profile.vcount, 0, 0xff))
    throw new TypeError("VCount must be between 00 and FF.");
  if (
    !integerIn(profile.timer0Min, 0, 0xffff) ||
    !integerIn(profile.timer0Max, 0, 0xffff)
  ) {
    throw new TypeError("Timer0 must be between 0000 and FFFF.");
  }
  if (!integerIn(profile.gxstat, 0, 99) || !integerIn(profile.vframe, 0, 99)) {
    throw new TypeError("GxStat and VFrame must be between 00 and 63.");
  }
  if (
    !Array.isArray(profile.keypresses) ||
    profile.keypresses.length !== 9 ||
    !profile.keypresses.every((value) => typeof value === "boolean") ||
    typeof profile.skipLR !== "boolean" ||
    typeof profile.memoryLink !== "boolean"
  ) {
    throw new TypeError("Invalid Gen 5 profile settings.");
  }
}

function validateSlots(slots: Gen5DreamRadarSlot[]) {
  if (!Array.isArray(slots) || slots.length < 1 || slots.length > 6)
    throw new TypeError("Enter information for at least 1 slot");
  slots.forEach((slot, index) => {
    if (!integerIn(slot.encounter, 0, GEN5_DREAM_RADAR_ENCOUNTERS.length - 1))
      throw new TypeError(`Slot ${index + 1} contains an invalid encounter.`);
    const encounter = GEN5_DREAM_RADAR_ENCOUNTERS[slot.encounter];
    if (index !== 0 && encounter.genie)
      throw new TypeError("Genie encounters are only available in Slot 1.");
    if (!allowedGen5DreamRadarGenders(slot.encounter).includes(slot.gender))
      throw new TypeError(`Slot ${index + 1} contains an invalid gender.`);
  });
}

function validateFilters(filters: Gen5DreamRadarFilters) {
  if (typeof filters.disabled !== "boolean")
    throw new TypeError("Invalid Dream Radar filter state.");
  if (
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Dream Radar IV filters require six values.");
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
  if (!integerIn(filters.natureMask, 1, ALL_NATURES))
    throw new TypeError("Select at least one Nature.");
  if (!integerIn(filters.hiddenPowerMask, 1, ALL_HIDDEN_POWERS))
    throw new TypeError("Select at least one Hidden Power type.");
}

export function gen5DreamRadarFiltersAcceptAll(filters: Gen5DreamRadarFilters) {
  return (
    filters.disabled ||
    (filters.ivMin.every((value) => value === 0) &&
      filters.ivMax.every((value) => value === 31) &&
      filters.natureMask === ALL_NATURES &&
      filters.hiddenPowerMask === ALL_HIDDEN_POWERS)
  );
}

export function gen5DreamRadarSearcherSeedCount(
  request: Gen5DreamRadarSearcherRequest,
) {
  const start = parseDate(request.startDate);
  const end = parseDate(request.endDate);
  if (start > end) return 0n;
  const days = BigInt(
    Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  const timer0Count =
    request.profile.timer0Min > request.profile.timer0Max
      ? 0n
      : BigInt(request.profile.timer0Max - request.profile.timer0Min + 1);
  return (
    days *
    timer0Count *
    BigInt(countGen5DreamRadarKeypresses(request.profile)) *
    86_400n
  );
}

export function gen5DreamRadarTaskCount(request: Gen5DreamRadarRequest) {
  const statesPerSeed = BigInt(request.maxAdvances) + 1n;
  const total =
    request.mode === "generator"
      ? statesPerSeed
      : gen5DreamRadarSearcherSeedCount(request);
  if (!gen5DreamRadarFiltersAcceptAll(request.filters)) return total;
  if (request.mode === "generator")
    return total < BigInt(request.resultLimit)
      ? total
      : BigInt(request.resultLimit);
  const seedsForLimit =
    (BigInt(request.resultLimit) + statesPerSeed - 1n) / statesPerSeed;
  return total < seedsForLimit ? total : seedsForLimit;
}

export function gen5DreamRadarEvaluationCount(request: Gen5DreamRadarRequest) {
  if (request.mode === "generator") return gen5DreamRadarTaskCount(request);
  return gen5DreamRadarTaskCount(request) * (BigInt(request.maxAdvances) + 1n);
}

export function validateGen5DreamRadarRequest(request: Gen5DreamRadarRequest) {
  if (request.mode !== "generator" && request.mode !== "searcher")
    throw new TypeError("Invalid Dream Radar operation.");
  validateProfile(request.profile);
  if (!integerIn(request.initialAdvances, 0, 0xffff_ffff))
    throw new TypeError("Initial Advances must be between 0 and 4294967295.");
  if (!integerIn(request.maxAdvances, 0, 0xffff_ffff))
    throw new TypeError("Max Advances must be between 0 and 4294967295.");
  if (request.maxAdvances > 0xffff_ffff - request.initialAdvances)
    throw new TypeError(
      "Initial Advances plus Max Advances exceeds 4294967295.",
    );
  if (!integerIn(request.badges, 0, 8))
    throw new TypeError("Badges must be between 0 and 8.");
  if (!integerIn(request.resultLimit, 1, GEN5_DREAM_RADAR_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  validateSlots(request.slots);
  validateFilters(request.filters);

  if (request.mode === "generator") {
    const normalized = request.seed.toUpperCase().padStart(16, "0");
    if (!HEX_16.test(normalized))
      throw new TypeError("Seed must contain at most 16 hexadecimal digits.");
  } else {
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (start > end) throw new TypeError("Start date is after end date");
    if (request.filters.disabled)
      throw new TypeError("Searcher filters cannot be disabled.");
  }

  if (
    gen5DreamRadarEvaluationCount(request) > GEN5_DREAM_RADAR_MAX_EVALUATIONS
  ) {
    throw new TypeError("Dream Radar range exceeds the browser task limit.");
  }
  return request;
}

export function splitGen5DreamRadarRequest(
  request: Gen5DreamRadarRequest,
  workers: number,
): Gen5DreamRadarChunk[] {
  validateGen5DreamRadarRequest(request);
  if (!Number.isInteger(workers) || workers < 1)
    throw new TypeError("Worker count must be a positive integer.");
  const taskCount = gen5DreamRadarTaskCount(request);
  if (taskCount === 0n) return [];
  if (taskCount > BigInt(Number.MAX_SAFE_INTEGER))
    throw new TypeError("Dream Radar task cannot be indexed safely.");
  const count = Number(taskCount);
  const evaluationsPerUnit =
    request.mode === "generator" ? 1 : request.maxAdvances + 1;
  const responsiveUnits = Math.max(
    1,
    Math.floor(1_000_000 / Math.max(1, evaluationsPerUnit)),
  );
  const minimumChunks = Math.min(count, Math.max(1, workers * 4));
  const chunkCount = Math.min(
    count,
    Math.max(minimumChunks, Math.ceil(count / responsiveUnits)),
  );
  const base = Math.floor(count / chunkCount);
  const remainder = count % chunkCount;
  const chunks: Gen5DreamRadarChunk[] = [];
  let start = 0;
  for (let index = 0; index < chunkCount; index += 1) {
    const chunkCountValue = base + (index < remainder ? 1 : 0);
    chunks.push({ index, start, count: chunkCountValue });
    start += chunkCountValue;
  }
  return chunks;
}

function hiddenPower(ivs: Gen5DreamRadarIvTuple) {
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

export function gen5DreamRadarCharacteristic(
  pid: number,
  ivs: Gen5DreamRadarIvTuple,
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

export function validateGen5DreamRadarResult(
  request: Gen5DreamRadarRequest,
  result: Gen5DreamRadarResult,
) {
  if (!HEX_16.test(result.seed) || !/^[0-9A-F]{8}$/.test(result.pid))
    throw new TypeError("Dream Radar result contains an invalid Seed or PID.");
  const pid = Number.parseInt(result.pid, 16) >>> 0;
  if (
    !integerIn(
      result.advances,
      request.initialAdvances,
      request.initialAdvances + request.maxAdvances,
    ) ||
    !integerIn(result.needle, 0, 7) ||
    !integerIn(result.ability, 0, 2) ||
    !integerIn(result.abilityIndex, 1, 0xffff) ||
    !integerIn(result.level, 5, 40) ||
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.hiddenPowerStrength, 30, 70) ||
    !integerIn(result.characteristic, 0, 29) ||
    !Array.isArray(result.ivs) ||
    result.ivs.length !== 6 ||
    !result.ivs.every((value) => integerIn(value, 0, 31))
  ) {
    throw new TypeError("Dream Radar result contains invalid state values.");
  }
  const expectedHiddenPower = hiddenPower(result.ivs);
  if (
    result.hiddenPower !== expectedHiddenPower.type ||
    result.hiddenPowerStrength !== expectedHiddenPower.power ||
    result.characteristic !== gen5DreamRadarCharacteristic(pid, result.ivs)
  ) {
    throw new TypeError(
      "Dream Radar result contains inconsistent derived values.",
    );
  }
  const levelTable = [5, 10, 10, 20, 20, 30, 30, 40, 40];
  const target = GEN5_DREAM_RADAR_ENCOUNTERS[request.slots.at(-1)!.encounter];
  const outputGender =
    target.legend && !target.genie ? 2 : request.slots.at(-1)!.gender;
  if (
    result.level !== levelTable[request.badges] ||
    result.gender !== outputGender
  )
    throw new TypeError("Dream Radar result does not match the selected slot.");
  if (!request.filters.disabled) {
    if (
      result.ivs.some(
        (value, index) =>
          value < request.filters.ivMin[index] ||
          value > request.filters.ivMax[index],
      ) ||
      (request.filters.natureMask & (1 << result.nature)) === 0 ||
      (request.filters.hiddenPowerMask & (1 << result.hiddenPower)) === 0
    ) {
      throw new TypeError("Dream Radar result does not match the filters.");
    }
  }

  if (request.mode === "generator") {
    const expectedSeed = request.seed.toUpperCase().padStart(16, "0");
    if (result.seed !== expectedSeed || result.dateTime !== undefined)
      throw new TypeError(
        "Dream Radar result does not match the generator request.",
      );
  } else {
    const match = result.dateTime && ISO_DATE_TIME.exec(result.dateTime);
    if (
      !match ||
      result.timer0 === undefined ||
      result.buttonMask === undefined
    )
      throw new TypeError(
        "Dream Radar search result is missing profile metadata.",
      );
    const date = parseDate(match[1]);
    const start = parseDate(request.startDate);
    const end = parseDate(request.endDate);
    if (
      date < start ||
      date > end ||
      Number(match[2]) > 23 ||
      Number(match[3]) > 59 ||
      Number(match[4]) > 59 ||
      !integerIn(
        result.timer0,
        request.profile.timer0Min,
        request.profile.timer0Max,
      ) ||
      !isGen5DreamRadarButtonMaskAllowed(request.profile, result.buttonMask)
    ) {
      throw new TypeError(
        "Dream Radar search result contains invalid profile metadata.",
      );
    }
  }
  return result;
}

export function formatGen5DreamRadarButtons(mask: number) {
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

export function normalizeGen5DreamRadarSeed(value: string) {
  return value
    .replace(/^0x/i, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 16)
    .toUpperCase()
    .replace(/^0+(?=.)/, "");
}
