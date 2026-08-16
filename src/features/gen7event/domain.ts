import {
  GEN7_EVENT_PERSONAL,
  type Gen7EventGameVersion,
  type Gen7EventPersonalForm,
} from "./data";

export const GEN7_EVENT_API_VERSION = 1;
export const GEN7_EVENT_REQUEST_WORDS = 58;
export const GEN7_EVENT_RESULT_WORDS = 9;
export const GEN7_EVENT_STEP_SIZE = 2_048;
export const GEN7_EVENT_MAX_RESULTS = 100_000;
export const GEN7_EVENT_MAX_FRAME = 1_000_000_000;
export const GEN7_EVENT_BROWSER_MAX_FRAME = 5_000_000;

export type { Gen7EventGameVersion } from "./data";
export type Gen7EventLanguage = "zh" | "en" | "ja";
export type Gen7EventIvTuple = [number, number, number, number, number, number];
export type Gen7EventPidType = "random" | "nonshiny" | "shiny" | "specified";
export type Gen7EventBlinkFilter = "any" | "blink" | "safe";
export type Gen7EventShinyFilter = "any" | "shiny" | "square";
export type Gen7EventGenderFilter = "any" | "male" | "female";
export type Gen7EventAbilityFilter = "any" | "first" | "second" | "hidden";

export interface Gen7EventSettings {
  species: number;
  form: number;
  level: number;
  fixedIvs: Gen7EventIvTuple;
  randomPerfectIvCount: number;
  abilityLocked: boolean;
  ability: number;
  natureLocked: boolean;
  nature: number;
  genderLocked: boolean;
  gender: number;
  yourId: boolean;
  isEgg: boolean;
  noDexEntry: boolean;
  otherInfo: boolean;
  pidType: Gen7EventPidType;
  tid: number;
  sid: number;
  ec: number;
  pid: number;
}

export interface Gen7EventFilters {
  disabled: boolean;
  shiny: Gen7EventShinyFilter;
  gender: Gen7EventGenderFilter;
  ability: Gen7EventAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7EventIvTuple;
  ivMax: Gen7EventIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
  blink: Gen7EventBlinkFilter;
}

export interface Gen7EventRequest {
  version: Gen7EventGameVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  tsv: number;
  trv: number;
  npc: number;
  delay: number;
  considerDelay: boolean;
  event: Gen7EventSettings;
  filters: Gen7EventFilters;
  resultLimit: number;
}

export interface Gen7EventResult {
  frame: number;
  realTimeFrames: number;
  random: bigint;
  ec: number;
  pid: number;
  ivs: Gen7EventIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  blink: number;
  delay: number;
  psv: number;
  prv: number;
}

const UINT32_MAX = 0xffff_ffff;
const UINT64_MAX = 0xffff_ffff_ffff_ffffn;
const ALL_NATURES = 0x1ff_ffff;
const PID_TYPE_VALUES: Record<Gen7EventPidType, number> = {
  random: 0,
  nonshiny: 1,
  shiny: 2,
  specified: 3,
};
const SHINY_FILTER_VALUES: Record<Gen7EventShinyFilter, number> = {
  any: 0,
  shiny: 1,
  square: 2,
};
const GENDER_FILTER_VALUES: Record<Gen7EventGenderFilter, number> = {
  any: 0,
  male: 1,
  female: 2,
};
const ABILITY_FILTER_VALUES: Record<Gen7EventAbilityFilter, number> = {
  any: 0,
  first: 1,
  second: 2,
  hidden: 3,
};
const BLINK_FILTER_VALUES: Record<Gen7EventBlinkFilter, number> = {
  any: 0,
  blink: 1,
  safe: 2,
};

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

function ivTuple(values: readonly number[]): Gen7EventIvTuple {
  if (values.length !== 6) throw new TypeError("Six IV values are required.");
  return [...values] as Gen7EventIvTuple;
}

function flag(value: boolean) {
  return value ? 1 : 0;
}

export function gen7EventStartingFrame(version: Gen7EventGameVersion) {
  return version === "sun" || version === "moon" ? 418 : 478;
}

export function gen7EventMaximumSpecies(version: Gen7EventGameVersion) {
  return version === "sun" || version === "moon" ? 802 : 807;
}

export function gen7EventDefaultDelay(
  version: Gen7EventGameVersion,
  event: Pick<Gen7EventSettings, "yourId" | "isEgg" | "noDexEntry">,
) {
  if (!event.noDexEntry && (!event.yourId || event.isEgg)) return 0;
  return version === "sun" || version === "moon" ? 62 : 42;
}

export function gen7EventPersonalForm(
  species: number,
  form: number,
): Gen7EventPersonalForm {
  const entry = GEN7_EVENT_PERSONAL[species];
  if (!entry || !entry.forms[form]) {
    throw new RangeError(
      "Species or form is outside the Gen 7 personal table.",
    );
  }
  return entry.forms[form];
}

export function gen7EventFormCount(species: number) {
  return GEN7_EVENT_PERSONAL[species]?.forms.length ?? 0;
}

export function gen7EventNoDexEligible(
  version: Gen7EventGameVersion,
  species: number,
) {
  const entry = GEN7_EVENT_PERSONAL[species];
  if (!entry) return false;
  return version === "sun" || version === "moon"
    ? entry.smNoDexEligible
    : entry.usumNoDexEligible;
}

export function gen7EventGenderSetting(genderRatio: number) {
  if (genderRatio === 0) return { setting: 1, random: false } as const;
  if (genderRatio === 0xfe) return { setting: 2, random: false } as const;
  if (genderRatio > 0x0f && genderRatio < 0xef) {
    return { setting: genderRatio - 1, random: true } as const;
  }
  return { setting: 0, random: false } as const;
}

export function gen7EventDefaultSettings(
  version: Gen7EventGameVersion,
  species = 0,
  form = 0,
): Gen7EventSettings {
  const personal = gen7EventPersonalForm(species, form);
  return {
    species,
    form,
    level: 0,
    fixedIvs: [-1, -1, -1, -1, -1, -1],
    randomPerfectIvCount: personal.defaultPerfectIvCount,
    abilityLocked: true,
    ability: 0,
    natureLocked: false,
    nature: 0,
    genderLocked: false,
    gender: 0,
    yourId: false,
    isEgg: false,
    noDexEntry: false,
    otherInfo: false,
    pidType: "random",
    tid: 0,
    sid: 0,
    ec: 0,
    pid: 0,
  };
}

export function parseGen7EventDecimal(value: string) {
  return value === "" ? 0 : Number.parseInt(value, 10);
}

export function parseGen7EventSignedDecimal(value: string) {
  return value === "" || value === "-" ? 0 : Number.parseInt(value, 10);
}

export function parseGen7EventHex(value: string) {
  return value === "" ? 0 : Number.parseInt(value, 16);
}

export function formatGen7EventHex32(value: number) {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen7EventHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}

export function validateGen7EventRequest(request: Gen7EventRequest) {
  const versions: readonly Gen7EventGameVersion[] = [
    "sun",
    "moon",
    "ultra-sun",
    "ultra-moon",
  ];
  if (!versions.includes(request.version))
    throw new TypeError("Unsupported Gen 7 game version.");
  if (!integerIn(request.seed, 0, UINT32_MAX))
    throw new TypeError("Seed must be a 32-bit unsigned integer.");
  const startingFrame = gen7EventStartingFrame(request.version);
  if (!integerIn(request.minFrame, startingFrame, GEN7_EVENT_MAX_FRAME))
    throw new TypeError(`Initial Frame must be at least ${startingFrame}.`);
  if (!integerIn(request.maxFrame, request.minFrame, GEN7_EVENT_MAX_FRAME))
    throw new TypeError("Max Frame must be at least Initial Frame.");
  if (request.maxFrame > GEN7_EVENT_BROWSER_MAX_FRAME)
    throw new RangeError(
      `The browser build supports frames through ${GEN7_EVENT_BROWSER_MAX_FRAME}.`,
    );
  if (!integerIn(request.tsv, 0, 4095))
    throw new TypeError("TSV must be between 0 and 4095.");
  if (!integerIn(request.trv, 0, 15))
    throw new TypeError("TRV must be a hexadecimal value from 0 to F.");
  if (!integerIn(request.npc, 0, 100))
    throw new TypeError("NPC count must be between 0 and 100.");
  if (!integerIn(request.delay, 0, 4000))
    throw new TypeError("Delay must be between 0 and 4000.");
  if (!boolean(request.considerDelay))
    throw new TypeError("Consider Delay must be boolean.");

  const event = request.event;
  if (!integerIn(event.species, 0, gen7EventMaximumSpecies(request.version)))
    throw new TypeError("Species is outside the selected game version.");
  if (
    !integerIn(
      event.form,
      0,
      Math.max(0, gen7EventFormCount(event.species) - 1),
    )
  )
    throw new TypeError("Form is outside the species form range.");
  if (!integerIn(event.level, 0, 100))
    throw new TypeError("Level must be between 0 and 100.");
  if (!Array.isArray(event.fixedIvs) || event.fixedIvs.length !== 6)
    throw new TypeError("Six fixed IV settings are required.");
  for (const iv of event.fixedIvs) {
    if (!integerIn(iv, -1, 31))
      throw new TypeError("Fixed IVs must use -1 or values from 0 to 31.");
  }
  if (!integerIn(event.randomPerfectIvCount, 0, 5))
    throw new TypeError(
      "Guaranteed random perfect IVs must be between 0 and 5.",
    );
  const fixedIvCount = event.fixedIvs.filter((iv) => iv >= 0).length;
  if (
    event.randomPerfectIvCount > 0 &&
    fixedIvCount + event.randomPerfectIvCount > 5
  ) {
    throw new TypeError(
      "Fixed IVs plus guaranteed random perfect IVs cannot exceed 5.",
    );
  }
  if (
    !boolean(event.abilityLocked) ||
    !boolean(event.natureLocked) ||
    !boolean(event.genderLocked) ||
    !boolean(event.yourId) ||
    !boolean(event.isEgg) ||
    !boolean(event.noDexEntry) ||
    !boolean(event.otherInfo)
  ) {
    throw new TypeError("Invalid Event flag.");
  }
  if (
    !integerIn(event.ability, 0, event.abilityLocked ? 3 : 1) ||
    !integerIn(event.nature, 0, 24) ||
    !integerIn(event.gender, 0, 2)
  ) {
    throw new TypeError("Invalid locked Event attribute.");
  }
  if (!Object.hasOwn(PID_TYPE_VALUES, event.pidType))
    throw new TypeError("Invalid PID Type.");
  if (!integerIn(event.tid, 0, 65535) || !integerIn(event.sid, 0, 65535))
    throw new TypeError("Event TID and SID must be between 0 and 65535.");
  if (
    !integerIn(event.ec, 0, UINT32_MAX) ||
    !integerIn(event.pid, 0, UINT32_MAX)
  )
    throw new TypeError("EC and PID must be 32-bit unsigned integers.");
  if (
    event.noDexEntry &&
    !gen7EventNoDexEligible(request.version, event.species)
  ) {
    throw new TypeError("No Dex Entry is unavailable for this species.");
  }

  const filters = request.filters;
  if (!boolean(filters.disabled)) throw new TypeError("Invalid filter state.");
  if (!Object.hasOwn(SHINY_FILTER_VALUES, filters.shiny))
    throw new TypeError("Invalid shiny filter.");
  if (!Object.hasOwn(GENDER_FILTER_VALUES, filters.gender))
    throw new TypeError("Invalid gender filter.");
  if (!Object.hasOwn(ABILITY_FILTER_VALUES, filters.ability))
    throw new TypeError("Invalid ability filter.");
  if (!Object.hasOwn(BLINK_FILTER_VALUES, filters.blink))
    throw new TypeError("Invalid Blink filter.");
  if (!integerIn(filters.natureMask, 0, ALL_NATURES))
    throw new TypeError("Invalid nature mask.");
  if (!integerIn(filters.hiddenPowerMask, 0, 0xffff))
    throw new TypeError("Invalid Hidden Power mask.");
  if (
    !Array.isArray(filters.ivMin) ||
    !Array.isArray(filters.ivMax) ||
    filters.ivMin.length !== 6 ||
    filters.ivMax.length !== 6
  ) {
    throw new TypeError("Six IV filter ranges are required.");
  }
  for (let index = 0; index < 6; index++) {
    if (
      !integerIn(filters.ivMin[index], 0, 31) ||
      !integerIn(filters.ivMax[index], filters.ivMin[index], 31)
    ) {
      throw new TypeError("IV filter minimums must not exceed maximums.");
    }
  }
  if (
    !integerIn(filters.perfectIvValue, 0, 31) ||
    !integerIn(filters.perfectIvCount, 0, 6)
  ) {
    throw new TypeError("Invalid perfect IV filter.");
  }
  if (filters.blink === "blink" && request.npc !== 0)
    throw new TypeError("Blink Frame is only available with 0 NPCs.");
  if (filters.blink === "safe" && request.npc === 0)
    throw new TypeError("Safe Frame requires at least 1 NPC.");
  if (!integerIn(request.resultLimit, 1, GEN7_EVENT_MAX_RESULTS))
    throw new TypeError("Result limit must be between 1 and 100000.");
  return request;
}

export function gen7EventTaskCount(request: Gen7EventRequest) {
  validateGen7EventRequest(request);
  return request.maxFrame - request.minFrame + 1;
}

export function gen7EventEffectiveTsv(request: Gen7EventRequest) {
  return request.event.yourId
    ? request.tsv
    : ((request.event.tid ^ request.event.sid) >>> 4) & 0xfff;
}

export function gen7EventHiddenPower(ivs: Gen7EventIvTuple) {
  let value = 0;
  for (let index = 0; index < ivs.length; index++) {
    value |= (ivs[index] & 1) << index;
  }
  return Math.trunc((value * 15) / 63);
}

export function gen7EventResultPassesFilters(
  request: Gen7EventRequest,
  result: Gen7EventResult,
) {
  const { filters } = request;
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
  if (
    filters.natureMask !== 0 &&
    (filters.natureMask & (1 << result.nature)) === 0
  ) {
    return false;
  }
  if (
    filters.hiddenPowerMask !== 0 &&
    (filters.hiddenPowerMask & (1 << result.hiddenPower)) === 0
  ) {
    return false;
  }
  let perfect = 0;
  for (let index = 0; index < result.ivs.length; index++) {
    if (
      result.ivs[index] < filters.ivMin[index] ||
      result.ivs[index] > filters.ivMax[index]
    ) {
      return false;
    }
    if (result.ivs[index] >= filters.perfectIvValue) perfect++;
  }
  return perfect >= filters.perfectIvCount;
}

export function encodeGen7EventRequest(request: Gen7EventRequest) {
  validateGen7EventRequest(request);
  const event = request.event;
  const personal = gen7EventPersonalForm(event.species, event.form);
  const personalGender = gen7EventGenderSetting(personal.genderRatio);
  const effectiveGenderLocked = event.genderLocked || !personalGender.random;
  const effectiveGender = event.genderLocked
    ? event.gender
    : personalGender.setting;
  const effectiveTsv = event.yourId
    ? request.tsv
    : ((event.tid ^ event.sid) >>> 4) & 0xfff;
  const effectiveTrv = event.yourId
    ? request.trv
    : (event.tid ^ event.sid) & 0xf;
  const words = new Uint32Array(GEN7_EVENT_REQUEST_WORDS);
  words.set([
    request.seed,
    request.minFrame,
    request.maxFrame,
    ["sun", "moon", "ultra-sun", "ultra-moon"].indexOf(request.version),
    effectiveTsv,
    effectiveTrv,
    request.npc,
    request.delay,
    flag(request.considerDelay),
    flag(event.noDexEntry),
    flag(event.yourId),
    flag(event.isEgg),
    flag(event.otherInfo),
    PID_TYPE_VALUES[event.pidType],
    event.yourId ? 0 : event.tid,
    event.yourId ? 0 : event.sid,
    event.ec,
    event.yourId ? 0 : event.pid,
    flag(event.abilityLocked),
    event.ability,
    flag(event.natureLocked),
    event.nature,
    flag(effectiveGenderLocked),
    effectiveGender,
    personalGender.setting,
    event.species,
    event.form,
    event.level,
    event.randomPerfectIvCount,
  ]);
  let offset = 29;
  for (const iv of event.fixedIvs) words[offset++] = iv >>> 0;
  words[offset++] = flag(request.filters.disabled);
  words[offset++] = SHINY_FILTER_VALUES[request.filters.shiny] > 0 ? 1 : 0;
  words[offset++] = SHINY_FILTER_VALUES[request.filters.shiny] === 2 ? 1 : 0;
  words[offset++] = GENDER_FILTER_VALUES[request.filters.gender];
  words[offset++] = ABILITY_FILTER_VALUES[request.filters.ability];
  words[offset++] = request.filters.natureMask;
  words[offset++] = request.filters.hiddenPowerMask;
  for (const value of request.filters.ivMin) words[offset++] = value;
  for (const value of request.filters.ivMax) words[offset++] = value;
  words[offset++] = request.filters.perfectIvValue;
  words[offset++] = request.filters.perfectIvCount;
  words[offset++] = BLINK_FILTER_VALUES[request.filters.blink];
  words[offset++] = request.resultLimit;
  if (offset !== GEN7_EVENT_REQUEST_WORDS)
    throw new Error("Gen 7 Event request packing changed unexpectedly.");
  return words;
}

export function decodeGen7EventResults(buffer: ArrayBuffer) {
  if (buffer.byteLength % (GEN7_EVENT_RESULT_WORDS * 4) !== 0)
    throw new RangeError("Invalid Gen 7 Event result buffer length.");
  const words = new Uint32Array(buffer);
  const results: Gen7EventResult[] = [];
  for (
    let offset = 0;
    offset < words.length;
    offset += GEN7_EVENT_RESULT_WORDS
  ) {
    const ivWord = words[offset + 6];
    const metadata = words[offset + 7];
    const pid = words[offset + 5];
    const shiny = (metadata >>> 13) & 1;
    const square = (metadata >>> 14) & 1;
    results.push({
      frame: words[offset],
      realTimeFrames: words[offset + 1],
      random: BigInt(words[offset + 2]) | (BigInt(words[offset + 3]) << 32n),
      ec: words[offset + 4],
      pid,
      ivs: [
        ivWord & 31,
        (ivWord >>> 5) & 31,
        (ivWord >>> 10) & 31,
        (ivWord >>> 15) & 31,
        (ivWord >>> 20) & 31,
        (ivWord >>> 25) & 31,
      ],
      nature: metadata & 31,
      ability: (metadata >>> 5) & 3,
      gender: (metadata >>> 7) & 3,
      hiddenPower: (metadata >>> 9) & 15,
      shiny: square ? 2 : shiny ? 1 : 0,
      blink: (metadata >>> 16) & 63,
      delay: words[offset + 8],
      psv: (((pid >>> 16) ^ (pid & 0xffff)) >>> 4) & 0xfff,
      prv: ((pid >>> 16) ^ (pid & 0xffff)) & 0xf,
    });
  }
  return results;
}

export function validateGen7EventResult(
  request: Gen7EventRequest,
  result: Gen7EventResult,
) {
  if (!integerIn(result.frame, request.minFrame, request.maxFrame))
    throw new TypeError("Gen 7 Event result frame is outside the request.");
  if (!integerIn(result.realTimeFrames, 0, UINT32_MAX))
    throw new TypeError("Invalid Gen 7 Event realtime value.");
  if (result.random < 0n || result.random > UINT64_MAX)
    throw new TypeError("Invalid Gen 7 Event random value.");
  if (
    !integerIn(result.ec, 0, UINT32_MAX) ||
    !integerIn(result.pid, 0, UINT32_MAX)
  )
    throw new TypeError("Invalid Gen 7 Event EC or PID.");
  if (result.ivs.length !== 6 || result.ivs.some((iv) => !integerIn(iv, 0, 31)))
    throw new TypeError("Invalid Gen 7 Event IV result.");
  if (
    !integerIn(result.nature, 0, 24) ||
    !integerIn(result.ability, 0, 3) ||
    !integerIn(result.gender, 0, 2) ||
    !integerIn(result.hiddenPower, 0, 15) ||
    !integerIn(result.shiny, 0, 2) ||
    !integerIn(result.blink, 0, 36) ||
    !integerIn(result.delay, 0, UINT32_MAX)
  ) {
    throw new TypeError("Invalid Gen 7 Event result metadata.");
  }
  const psv = (((result.pid >>> 16) ^ (result.pid & 0xffff)) >>> 4) & 0xfff;
  const prv = ((result.pid >>> 16) ^ (result.pid & 0xffff)) & 0xf;
  if (result.psv !== psv || result.prv !== prv)
    throw new TypeError("Gen 7 Event PSV or PRV mismatch.");
  return result;
}

function readUInt32(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(
    offset,
    true,
  );
}

function readUInt16(data: Uint8Array, offset: number) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint16(
    offset,
    true,
  );
}

export function parseGen7WonderCard(fileName: string, bytes: Uint8Array) {
  const lowerName = fileName.toLowerCase();
  const full = lowerName.endsWith(".wc7full");
  if (!full && !lowerName.endsWith(".wc7"))
    throw new TypeError("Only .wc7 and .wc7full files are supported.");
  const start = full ? 0x208 : 0;
  if (bytes.byteLength < start + 0x108)
    throw new RangeError("The Wonder Card file is truncated.");
  const data = bytes.subarray(start, start + 0x108);
  if (data[0x51] !== 0)
    throw new TypeError("The Wonder Card does not contain a Pokemon.");

  const species = readUInt16(data, 0x82);
  const form = data[0x84];
  const abilityCode = data[0xa2];
  const natureCode = data[0xa0];
  const genderCode = data[0xa1];
  const pidCode = data[0xa3];
  const level = data[0xd0];
  if (
    species > 807 ||
    abilityCode > 4 ||
    (natureCode !== 0xff && natureCode > 24) ||
    genderCode > 3 ||
    pidCode > 3 ||
    level > 100 ||
    form >= gen7EventFormCount(species)
  ) {
    throw new TypeError("The Wonder Card contains unsupported Event settings.");
  }

  const reorderedOffsets = [0, 1, 2, 4, 5, 3] as const;
  const rawIvs = reorderedOffsets.map((offset) => data[0xaf + offset]);
  const ivFlag = rawIvs.find((iv) => iv >= 0xfc && iv <= 0xfe) ?? 0;
  const fixedIvs = rawIvs.map((iv) =>
    ivFlag === 0 && iv <= 31 ? iv : -1,
  ) as Gen7EventIvTuple;
  const pidTypes: readonly Gen7EventPidType[] = [
    "specified",
    "random",
    "shiny",
    "nonshiny",
  ];

  return {
    species,
    form,
    level,
    fixedIvs: ivTuple(fixedIvs),
    randomPerfectIvCount: ivFlag === 0 ? 0 : ivFlag - 0xfb,
    abilityLocked: abilityCode < 3,
    ability: abilityCode < 3 ? abilityCode + 1 : abilityCode - 3,
    natureLocked: natureCode !== 0xff,
    nature: natureCode === 0xff ? 0 : natureCode,
    genderLocked: genderCode !== 3,
    gender: genderCode === 3 ? 0 : (genderCode + 1) % 3,
    yourId: data[0xb5] === 3,
    isEgg: data[0xd1] === 1,
    noDexEntry: false,
    otherInfo: true,
    pidType: pidTypes[pidCode],
    tid: readUInt16(data, 0x68),
    sid: readUInt16(data, 0x6a),
    ec: readUInt32(data, 0x70),
    pid: pidTypes[pidCode] === "specified" ? readUInt32(data, 0xd4) : 0,
  } satisfies Gen7EventSettings;
}

export function validateGen7WonderCardForVersion(
  version: Gen7EventGameVersion,
  event: Gen7EventSettings,
) {
  if (event.species > gen7EventMaximumSpecies(version))
    throw new TypeError(
      "The Wonder Card species is unavailable in this version.",
    );
  if (event.form >= gen7EventFormCount(event.species))
    throw new TypeError("The Wonder Card form is unavailable in this version.");
  return event;
}
