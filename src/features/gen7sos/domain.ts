import {
  GEN7_WILD_AREAS,
  type Gen7WildArea,
  type Gen7WildGameVersion,
  type Gen7WildSlot,
} from "../gen7wild/data";
import {
  gen7WildLocationName,
  gen7WildSpeciesName,
  gen7WildStartingFrame,
  type Gen7WildLanguage,
} from "../gen7wild/domain";
import {
  GEN7_SOS_ALLY_RULES,
  GEN7_SOS_PERSONAL,
  type Gen7SosPersonal,
} from "./data";

export const GEN7_SOS_API_VERSION = 1;
export const GEN7_SOS_REQUEST_WORDS = 77;
export const GEN7_SOS_RESULT_WORDS = 14;
export const GEN7_SOS_MAX_FRAME = 10_000_000;
export const GEN7_SOS_MAX_RESULTS = 100_000;
export const GEN7_SOS_STEP_SIZE = 16_384;
export const GEN7_SOS_SLOT_COUNT = 9;

export type Gen7SosMode = "pokemon" | "calls";
export type Gen7SosWeather = "none" | "rain" | "hail" | "sand";
export type Gen7SosLead =
  | "none"
  | "synchronize"
  | "cute-charm-male"
  | "cute-charm-female"
  | "static"
  | "magnet-pull"
  | "compound-eyes"
  | "suction-cups"
  | "level-modifier"
  | "black-flute"
  | "white-flute";
export type Gen7SosShinyFilter = "any" | "shiny" | "square";
export type Gen7SosGenderFilter = "any" | "male" | "female";
export type Gen7SosAbilityFilter = "any" | "1" | "2" | "hidden";
export type Gen7SosBlinkFilter = "any" | "blink" | "safe";
export type Gen7SosIvTuple = [number, number, number, number, number, number];

export interface Gen7SosSlot extends Gen7SosPersonal {
  readonly specForm: number;
}

export interface Gen7SosCallConditions {
  callRate: number;
  hpBonus: 1 | 3 | 5;
  adrenalineOrb: boolean;
  intimidate: boolean;
  lastCallSucceeded: boolean;
  lastCallFailed: boolean;
  superEffective: boolean;
}

export interface Gen7SosPokemonFilters {
  disabled: boolean;
  shiny: Gen7SosShinyFilter;
  gender: Gen7SosGenderFilter;
  ability: Gen7SosAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7SosIvTuple;
  ivMax: Gen7SosIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
  blink: Gen7SosBlinkFilter;
  slotMask: number;
  level: number;
}

export interface Gen7SosCallFilters {
  disabled: boolean;
  successOnly: boolean;
  syncOnly: boolean;
  hiddenAbilityOnly: boolean;
  slotMask: number;
  level: number;
}

export interface Gen7SosPokemonRequest {
  mode: "pokemon";
  version: Gen7WildGameVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  syncNature: number | null;
  lead: Gen7SosLead;
  npc: number;
  considerDelay: boolean;
  delayTime: number;
  sosSeed: number;
  sosFrame: number;
  chainLength: number;
  levelMin: number;
  levelMax: number;
  weather: Gen7SosWeather;
  slots: readonly Gen7SosSlot[];
  callConditions: Gen7SosCallConditions;
  filters: Gen7SosPokemonFilters;
  resultLimit: number;
}

export interface Gen7SosCallRequest {
  mode: "calls";
  seed: number;
  minFrame: number;
  maxFrame: number;
  delay: number;
  chainLength: number;
  levelMin: number;
  levelMax: number;
  weather: boolean;
  existingPerfectIvMask: number;
  callConditions: Gen7SosCallConditions;
  filters: Gen7SosCallFilters;
  resultLimit: number;
}

export type Gen7SosRequest = Gen7SosPokemonRequest | Gen7SosCallRequest;

export interface Gen7SosPokemonResult {
  mode: "pokemon";
  frame: number;
  realTimeFrames: number;
  random: bigint;
  ec: number;
  pid: number;
  ivs: Gen7SosIvTuple;
  nature: number;
  ability: number;
  gender: number;
  hiddenPower: number;
  shiny: number;
  synchronize: boolean;
  blink: number;
  delay: number;
  species: number;
  form: number;
  level: number;
  slot: number;
  item: number;
  call1: number;
  call2: number;
  rate1: number;
  rate2: number;
  callSuccess: boolean;
  bumpedIvMask: number;
  battleAdvance: number;
  psv: number;
  prv: number;
}

export interface Gen7SosCallResult {
  mode: "calls";
  frame: number;
  random: number;
  call1: number;
  call2: number;
  rate1: number;
  rate2: number;
  success: boolean;
  synchronize: boolean;
  slot: number;
  level: number;
  item: number;
  bumpedIvMask: number;
  hiddenAbility: boolean;
  advance: number;
}

export type Gen7SosResult = Gen7SosPokemonResult | Gen7SosCallResult;

const VERSION_CODE: Record<Gen7WildGameVersion, number> = {
  sun: 0,
  moon: 1,
  "ultra-sun": 2,
  "ultra-moon": 3,
};
const MODE_CODE: Record<Gen7SosMode, number> = { pokemon: 0, calls: 1 };
const WEATHER_CODE: Record<Gen7SosWeather, number> = {
  none: 0,
  rain: 1,
  hail: 2,
  sand: 3,
};
const LEAD_CODE: Record<Gen7SosLead, number> = {
  none: 0,
  synchronize: 1,
  "cute-charm-male": 2,
  "cute-charm-female": 3,
  static: 4,
  "magnet-pull": 5,
  "compound-eyes": 6,
  "suction-cups": 7,
  "level-modifier": 8,
  "black-flute": 9,
  "white-flute": 10,
};

const SOS_SLOT_CHANCES = [1, 1, 1, 10, 10, 10, 67, 1, 10] as const;
const WEATHER_LOCATIONS = new Set([134, 90, 120, 184, 114, 146, 124]);

function familyForVersion(version: Gen7WildGameVersion) {
  return version === "sun" || version === "moon" ? "sm" : "usum";
}

function isMoonVersion(version: Gen7WildGameVersion) {
  return version === "moon" || version === "ultra-moon";
}

function isUltraVersion(version: Gen7WildGameVersion) {
  return version === "ultra-sun" || version === "ultra-moon";
}

function areaSlots(
  area: Gen7WildArea,
  version: Gen7WildGameVersion,
  night: boolean,
) {
  if (isMoonVersion(version)) {
    return night ? area.variants.moonNight : area.variants.moonDay;
  }
  return night ? area.variants.sunNight : area.variants.sunDay;
}

export function gen7SosAreas(version: Gen7WildGameVersion) {
  return GEN7_WILD_AREAS.filter(
    (area) =>
      area.family === familyForVersion(version) && area.category === "normal",
  );
}

export function gen7SosLocationName(
  area: Gen7WildArea,
  language: Gen7WildLanguage,
) {
  return gen7WildLocationName(area, language);
}

export function gen7SosSpeciesName(
  specForm: number,
  language: Gen7WildLanguage,
) {
  return gen7WildSpeciesName(specForm & 0x7ff, specForm >>> 11, language);
}

export function gen7SosPersonal(specForm: number): Gen7SosSlot {
  const personal = GEN7_SOS_PERSONAL[String(specForm)];
  if (!personal) {
    throw new RangeError(`Missing Gen 7 SOS personal data for ${specForm}.`);
  }
  return { ...personal, specForm };
}

export function gen7SosCallers(
  area: Gen7WildArea,
  version: Gen7WildGameVersion,
  night: boolean,
) {
  const seen = new Set<number>();
  return areaSlots(area, version, night)
    .map((slot: Gen7WildSlot) => slot.species | (slot.form << 11))
    .filter((specForm) => {
      if (seen.has(specForm)) return false;
      seen.add(specForm);
      return gen7SosPersonal(specForm).callRate > 0;
    });
}

function ruleMatches(
  rule: (typeof GEN7_SOS_ALLY_RULES)[number],
  location: number,
  ultra: boolean,
) {
  if (rule.locations.length === 0) return rule.ultra === ultra;
  if (rule.ultra === null) return rule.locations.includes(location);
  return rule.ultra === ultra && rule.locations.includes(location);
}

function regularAllies(
  locationIndex: number,
  caller: number,
  version: Gen7WildGameVersion,
  night: boolean,
) {
  if (gen7SosPersonal(caller).callRate === 0) return Array<number>(7).fill(0);
  const ultra = isUltraVersion(version);
  if (ultra && locationIndex === 124 && caller !== 0) {
    const result = Array<number>(7).fill(caller);
    result[5] = version === "ultra-sun" ? 622 : 343;
    return result;
  }
  const candidates = GEN7_SOS_ALLY_RULES.filter(
    (rule) => rule.species === caller,
  );
  const rule =
    candidates.find((entry) =>
      ruleMatches(entry, locationIndex & 0xff, ultra),
    ) ??
    candidates.find(
      (entry) => entry.ultra === null && entry.locations.length === 0,
    );
  if (!rule) return Array<number>(7).fill(caller);

  const allies = Array<number>(7).fill(caller);
  if (rule.baby > 0) allies[4] = rule.baby;
  const first = rule.allies[0] ?? caller;
  const second = rule.allies[1] ?? caller;
  switch (rule.slotType) {
    case 1:
      allies[0] = first;
      break;
    case 2:
      allies.fill(first);
      break;
    case 3: {
      const adjusted =
        (night && first === 196) || (!night && first === 367)
          ? first + 1
          : first;
      allies[0] = allies[1] = allies[2] = adjusted;
      break;
    }
    case 4:
      allies[0] = allies[1] = allies[2] = allies[3] = first;
      break;
    case 5:
      allies[0] = allies[1] = allies[2] = allies[3] = first;
      allies[4] = allies[5] = allies[6] = second;
      break;
    case 6:
      allies[0] =
        allies[1] =
        allies[2] =
        allies[3] =
        allies[4] =
        allies[5] =
          first;
      break;
    case 7:
      allies[6] = first;
      break;
    case 8:
      allies[3] = allies[4] = first;
      break;
    case 9:
      allies[0] = first;
      allies[1] = allies[2] = allies[3] = second;
      break;
    case 10:
      allies[4] = allies[5] = first;
      break;
    case 11:
      allies[0] = allies[1] = allies[2] = first;
      allies[3] = allies[4] = allies[5] = allies[6] = second;
      break;
  }
  return allies;
}

function weatherAllies(
  locationIndex: number,
  weather: Gen7SosWeather,
  version: Gen7WildGameVersion,
  night: boolean,
) {
  const location = locationIndex & 0xff;
  const index = locationIndex >>> 8;
  if (weather === "none" || !WEATHER_LOCATIONS.has(location)) return [0, 0];
  const result = [351, 351];
  if (weather === "rain" && location === 134) {
    result[0] = night ? 186 : 62;
    result[1] = 61;
  } else if (weather === "rain" && (location === 90 || location === 120)) {
    result[1] = 704;
  } else if (weather === "rain" && location === 184) {
    result[1] = 705;
  } else if (
    weather === "hail" &&
    (location === 114 ||
      (location === 146 && isUltraVersion(version) && index === 1))
  ) {
    result[1] = 582;
  } else if (weather === "hail" && location === 146) {
    if (isUltraVersion(version)) result[0] = 584;
    result[1] = 583;
  } else if (weather === "sand" && location === 124) {
    result[1] = 444;
  }
  return result;
}

export function gen7SosSlots(options: {
  area: Gen7WildArea;
  caller: number;
  version: Gen7WildGameVersion;
  night: boolean;
  weather: Gen7SosWeather;
}) {
  const { area, caller, version, night, weather } = options;
  return [
    ...regularAllies(area.locationIndex, caller, version, night),
    ...weatherAllies(area.locationIndex, weather, version, night),
  ].map((specForm) =>
    specForm === 0
      ? {
          specForm: 0,
          species: 0,
          form: 0,
          gender: 0,
          randomGender: false,
          fixedThreeIv: false,
          electric: false,
          steel: false,
          callRate: 0,
        }
      : gen7SosPersonal(specForm),
  );
}

export function gen7SosAllyOptions(slots: readonly Gen7SosSlot[]) {
  const values = new Map<number, number>();
  slots.forEach((slot, index) => {
    if (slot.specForm === 0) return;
    values.set(
      slot.specForm,
      (values.get(slot.specForm) ?? 0) + SOS_SLOT_CHANCES[index],
    );
  });
  return [...values].map(([specForm, chance]) => ({ specForm, chance }));
}

export function gen7SosTaskCount(request: Gen7SosRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function gen7SosHiddenPower(ivs: readonly number[]) {
  const order = [0, 1, 2, 4, 5, 3];
  const bits = ivs.reduce(
    (sum, iv, index) => sum + ((iv & 1) << order[index]),
    0,
  );
  return Math.trunc((15 * bits) / 63);
}

function assertInteger(
  value: number,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(
      `${label} must be an integer between ${minimum} and ${maximum}.`,
    );
  }
}

function assertFlag(value: boolean, label: string) {
  if (typeof value !== "boolean")
    throw new TypeError(`${label} must be boolean.`);
}

function validateCallConditions(conditions: Gen7SosCallConditions) {
  assertInteger(conditions.callRate, "Call Rate", 0, 15);
  if (![0, 3, 6, 9, 15].includes(conditions.callRate)) {
    throw new RangeError("Call Rate must be 0, 3, 6, 9, or 15.");
  }
  if (![1, 3, 5].includes(conditions.hpBonus)) {
    throw new RangeError("HP bonus must be 1, 3, or 5.");
  }
  assertFlag(conditions.adrenalineOrb, "Adrenaline Orb");
  assertFlag(conditions.intimidate, "Intimidate");
  assertFlag(conditions.lastCallSucceeded, "Last Turn: Called");
  assertFlag(conditions.lastCallFailed, "Last Turn: Called and Failed");
  assertFlag(conditions.superEffective, "Super Effective");
}

function roundToEven(value: number) {
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

export function gen7SosCallRates(conditions: Gen7SosCallConditions) {
  validateCallConditions(conditions);
  const rate1 = Math.min(
    100,
    conditions.callRate *
      conditions.hpBonus *
      (conditions.adrenalineOrb ? 2 : 1),
  );
  let rate2 =
    (conditions.callRate * (conditions.intimidate ? 0x4ccc : 0x4000)) / 4096;
  if (conditions.lastCallSucceeded) rate2 *= 1.5;
  if (conditions.superEffective) rate2 *= 2;
  if (conditions.lastCallFailed) rate2 *= 3;
  return { rate1, rate2: roundToEven(Math.min(100, rate2)) };
}

function validateSlots(slots: readonly Gen7SosSlot[]) {
  if (slots.length !== GEN7_SOS_SLOT_COUNT) {
    throw new RangeError(`SOS requires exactly ${GEN7_SOS_SLOT_COUNT} slots.`);
  }
  slots.forEach((slot, index) => {
    if (index < 7 && slot.species === 0) {
      throw new RangeError(`Regular SOS slot ${index + 1} cannot be empty.`);
    }
    assertInteger(slot.species, `SOS slot ${index + 1} species`, 0, 807);
    assertInteger(slot.form, `SOS slot ${index + 1} form`, 0, 255);
    assertInteger(slot.gender, `SOS slot ${index + 1} gender`, 0, 224);
    assertFlag(slot.randomGender, `SOS slot ${index + 1} random gender`);
    assertFlag(slot.fixedThreeIv, `SOS slot ${index + 1} fixed 3IV`);
    assertFlag(slot.electric, `SOS slot ${index + 1} electric`);
    assertFlag(slot.steel, `SOS slot ${index + 1} steel`);
  });
}

export function validateGen7SosRequest(request: Gen7SosRequest) {
  assertInteger(request.seed, "Seed", 0, 0xffff_ffff);
  assertInteger(request.resultLimit, "Result limit", 1, GEN7_SOS_MAX_RESULTS);
  assertInteger(request.chainLength, "Chain Length", 0, 255);
  assertInteger(request.levelMin, "Minimum level", 1, 100);
  assertInteger(request.levelMax, "Maximum level", request.levelMin, 100);
  validateCallConditions(request.callConditions);

  if (request.mode === "pokemon") {
    if (!(request.version in VERSION_CODE)) {
      throw new RangeError("Unsupported Gen 7 game version.");
    }
    assertInteger(
      request.minFrame,
      "Initial Frame",
      gen7WildStartingFrame(request.version),
      GEN7_SOS_MAX_FRAME,
    );
    assertInteger(
      request.maxFrame,
      "Max Frame",
      request.minFrame,
      GEN7_SOS_MAX_FRAME,
    );
    assertInteger(request.tsv, "TSV", 0, 4095);
    assertInteger(request.trv, "TRV", 0, 15);
    assertFlag(request.shinyCharm, "Shiny Charm");
    if (!(request.lead in LEAD_CODE)) throw new RangeError("Unsupported Lead.");
    if (request.syncNature !== null) {
      assertInteger(request.syncNature, "Sync Nature", 0, 24);
    }
    if (request.lead === "synchronize" && request.syncNature === null) {
      throw new RangeError("Synchronize requires a Sync Nature.");
    }
    if (request.lead !== "synchronize" && request.syncNature !== null) {
      throw new RangeError("Sync Nature is only available with Synchronize.");
    }
    assertInteger(request.npc, "# of NPCs", 0, 100);
    assertFlag(request.considerDelay, "Consider Delay");
    assertInteger(request.delayTime, "Delay", 0, 4_000);
    if ((request.delayTime & 1) !== 0) {
      throw new RangeError("Delay must use the upstream 2-frame increment.");
    }
    assertInteger(request.sosSeed, "SOS Seed", 0, 0xffff_ffff);
    assertInteger(request.sosFrame, "SOS Frame", 0, 1_000_000);
    if (!(request.weather in WEATHER_CODE)) {
      throw new RangeError("Unsupported SOS weather.");
    }
    validateSlots(request.slots);
    const filters = request.filters;
    assertFlag(filters.disabled, "Ignore Filters");
    assertInteger(filters.natureMask, "Nature filter", 0, 0x1ff_ffff);
    assertInteger(filters.hiddenPowerMask, "Hidden Power filter", 0, 0xffff);
    assertInteger(filters.slotMask, "Slot filter", 0, 0x3ff);
    assertInteger(filters.level, "Level filter", 0, 100);
    filters.ivMin.forEach((value, index) =>
      assertInteger(value, `IV minimum ${index}`, 0, 31),
    );
    filters.ivMax.forEach((value, index) => {
      assertInteger(value, `IV maximum ${index}`, 0, 31);
      if (value < filters.ivMin[index]) {
        throw new RangeError(`IV range ${index} is reversed.`);
      }
    });
    assertInteger(filters.perfectIvValue, "Perfect IV threshold", 0, 31);
    assertInteger(filters.perfectIvCount, "Perfect IV count", 0, 6);
  } else {
    assertInteger(request.minFrame, "Initial Frame", 0, GEN7_SOS_MAX_FRAME);
    assertInteger(
      request.maxFrame,
      "Max Frame",
      request.minFrame,
      GEN7_SOS_MAX_FRAME,
    );
    assertInteger(request.delay, "Delay", 0, 10_000);
    assertFlag(request.weather, "Weather");
    assertInteger(
      request.existingPerfectIvMask,
      "Existing perfect IV mask",
      0,
      0x3f,
    );
    const filters = request.filters;
    assertFlag(filters.disabled, "Ignore Filters");
    assertFlag(filters.successOnly, "Success Only");
    assertFlag(filters.syncOnly, "Sync Success");
    assertFlag(filters.hiddenAbilityOnly, "Hidden Ability");
    assertInteger(filters.slotMask, "Slot filter", 0, 0x3ff);
    assertInteger(filters.level, "Level filter", 0, 100);
  }
  return request;
}

function packedSlotMetadata(slot?: Gen7SosSlot) {
  if (!slot) return 0;
  return (
    slot.gender |
    (Number(slot.randomGender) << 8) |
    (Number(slot.fixedThreeIv) << 9) |
    (Number(slot.electric) << 10) |
    (Number(slot.steel) << 11)
  );
}

function emptyPokemonFilters(): Gen7SosPokemonFilters {
  return {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0,
    hiddenPowerMask: 0,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
    slotMask: 0,
    level: 0,
  };
}

function emptyCallFilters(): Gen7SosCallFilters {
  return {
    disabled: true,
    successOnly: false,
    syncOnly: false,
    hiddenAbilityOnly: false,
    slotMask: 0,
    level: 0,
  };
}

export function encodeGen7SosRequest(request: Gen7SosRequest) {
  validateGen7SosRequest(request);
  const pokemon = request.mode === "pokemon";
  const pokemonFilters = pokemon ? request.filters : emptyPokemonFilters();
  const callFilters = pokemon ? emptyCallFilters() : request.filters;
  const slots = pokemon ? request.slots : [];
  const species = Array<number>(GEN7_SOS_SLOT_COUNT).fill(0);
  const metadata = Array<number>(GEN7_SOS_SLOT_COUNT).fill(0);
  slots.forEach((slot, index) => {
    species[index] = slot.species | (slot.form << 11);
    metadata[index] = packedSlotMetadata(slot);
  });
  const words = [
    MODE_CODE[request.mode],
    pokemon ? VERSION_CODE[request.version] : 0,
    request.seed,
    request.minFrame,
    request.maxFrame,
    request.resultLimit,
    pokemon ? request.tsv : 0,
    pokemon ? request.trv : 0,
    Number(pokemon && request.shinyCharm),
    pokemon ? (request.syncNature ?? 0xff) : 0xff,
    pokemon ? LEAD_CODE[request.lead] : 0,
    pokemon ? request.npc : 0,
    Number(pokemon && request.considerDelay),
    pokemon ? Math.trunc(request.delayTime / 2) + 2 : 0,
    pokemon ? request.sosSeed : 0,
    pokemon ? request.sosFrame : 0,
    request.chainLength,
    request.levelMin,
    request.levelMax,
    pokemon ? WEATHER_CODE[request.weather] : Number(request.weather),
    request.callConditions.callRate,
    request.callConditions.hpBonus,
    Number(request.callConditions.adrenalineOrb),
    Number(request.callConditions.intimidate),
    Number(request.callConditions.lastCallSucceeded),
    Number(request.callConditions.lastCallFailed),
    Number(request.callConditions.superEffective),
    pokemon ? 0 : request.existingPerfectIvMask,
    pokemon ? 0 : request.delay,
    ...species,
    ...metadata,
    Number(pokemonFilters.disabled),
    Number(pokemonFilters.shiny !== "any"),
    Number(pokemonFilters.shiny === "square"),
    pokemonFilters.gender === "any"
      ? 0
      : pokemonFilters.gender === "male"
        ? 1
        : 2,
    pokemonFilters.ability === "any"
      ? 0
      : pokemonFilters.ability === "1"
        ? 1
        : pokemonFilters.ability === "2"
          ? 2
          : 3,
    pokemonFilters.natureMask,
    pokemonFilters.hiddenPowerMask,
    ...pokemonFilters.ivMin,
    ...pokemonFilters.ivMax,
    pokemonFilters.perfectIvValue,
    pokemonFilters.perfectIvCount,
    pokemonFilters.blink === "any"
      ? 0
      : pokemonFilters.blink === "blink"
        ? 1
        : 2,
    pokemonFilters.slotMask,
    pokemonFilters.level,
    Number(callFilters.disabled),
    Number(callFilters.successOnly),
    Number(callFilters.syncOnly),
    Number(callFilters.hiddenAbilityOnly),
    callFilters.slotMask,
    callFilters.level,
  ];
  if (words.length !== GEN7_SOS_REQUEST_WORDS) {
    throw new Error(`Gen 7 SOS request ABI mismatch: ${words.length}.`);
  }
  return new Uint32Array(words.map((word) => word >>> 0));
}

function decodeCallInfo(word: number) {
  return {
    call1: word & 0xff,
    call2: (word >>> 8) & 0xff,
    rate1: (word >>> 16) & 0xff,
    rate2: (word >>> 24) & 0xff,
  };
}

export function decodeGen7SosResults(
  mode: Gen7SosMode,
  buffer: ArrayBuffer,
): Gen7SosResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_SOS_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen 7 SOS result buffer length.");
  }
  const results: Gen7SosResult[] = [];
  for (let offset = 0; offset < words.length; offset += GEN7_SOS_RESULT_WORDS) {
    const call = decodeCallInfo(words[offset + 10]);
    if (mode === "calls") {
      const meta = words[offset + 7];
      results.push({
        mode,
        frame: words[offset],
        random: words[offset + 2],
        ...call,
        success: Boolean((meta >>> 15) & 1),
        synchronize: Boolean(meta & 1),
        slot: (meta >>> 1) & 0xf,
        level: (meta >>> 5) & 0x7f,
        item: (meta >>> 12) & 0x3,
        hiddenAbility: Boolean((meta >>> 14) & 1),
        bumpedIvMask: words[offset + 6] & 0x3f,
        advance: words[offset + 8],
      });
      continue;
    }
    const ivWord = words[offset + 6];
    const meta = words[offset + 7];
    const encounter = words[offset + 9];
    const pid = words[offset + 5];
    const xorValue = (pid >>> 16) ^ (pid & 0xffff);
    results.push({
      mode,
      frame: words[offset],
      realTimeFrames: words[offset + 1],
      random: (BigInt(words[offset + 3]) << 32n) | BigInt(words[offset + 2]),
      ec: words[offset + 4],
      pid,
      ivs: [0, 1, 2, 3, 4, 5].map(
        (index) => (ivWord >>> (index * 5)) & 0x1f,
      ) as Gen7SosIvTuple,
      nature: meta & 0x1f,
      ability: (meta >>> 5) & 0x3,
      gender: (meta >>> 7) & 0x3,
      hiddenPower: (meta >>> 9) & 0xf,
      shiny: (meta >>> 13) & 0x3,
      synchronize: Boolean((meta >>> 15) & 1),
      blink: (meta >>> 16) & 0x3f,
      callSuccess: Boolean((meta >>> 22) & 1),
      bumpedIvMask: words[offset + 11] & 0x3f,
      battleAdvance: words[offset + 12],
      delay: words[offset + 8] | 0,
      species: encounter & 0x7ff,
      form: (encounter >>> 11) & 0xff,
      level: (encounter >>> 19) & 0x7f,
      slot: (encounter >>> 26) & 0xf,
      item: (encounter >>> 30) & 0x3,
      ...call,
      psv: xorValue >>> 4,
      prv: xorValue & 0xf,
    });
  }
  return results;
}

export function gen7SosResultPassesFilters(
  request: Gen7SosRequest,
  result: Gen7SosResult,
) {
  if (request.mode === "calls") {
    if (result.mode !== "calls") return false;
    const filters = request.filters;
    if (filters.disabled) return true;
    if (filters.successOnly && !result.success) return false;
    if (filters.syncOnly && !result.synchronize) return false;
    if (filters.hiddenAbilityOnly && !result.hiddenAbility) return false;
    if (
      filters.slotMask !== 0 &&
      (filters.slotMask & (1 << result.slot)) === 0
    ) {
      return false;
    }
    if (filters.level !== 0 && filters.level !== result.level) return false;
    return true;
  }
  if (result.mode !== "pokemon") return false;
  const filters = request.filters;
  if (filters.disabled) return true;
  if (filters.shiny !== "any" && result.shiny === 0) return false;
  if (filters.shiny === "square" && result.shiny !== 2) return false;
  if (
    filters.gender !== "any" &&
    result.gender !== (filters.gender === "male" ? 1 : 2)
  ) {
    return false;
  }
  if (filters.ability !== "any") {
    const ability =
      filters.ability === "1" ? 1 : filters.ability === "2" ? 2 : 3;
    if (result.ability !== ability) return false;
  }
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
  if (filters.slotMask !== 0 && (filters.slotMask & (1 << result.slot)) === 0) {
    return false;
  }
  if (filters.level !== 0 && result.level !== filters.level) return false;
  let perfect = 0;
  for (let index = 0; index < 6; index++) {
    if (
      result.ivs[index] < filters.ivMin[index] ||
      result.ivs[index] > filters.ivMax[index]
    ) {
      return false;
    }
    if (result.ivs[index] >= filters.perfectIvValue) perfect++;
  }
  if (perfect < filters.perfectIvCount) return false;
  if (filters.blink === "blink" && result.blink < 4) return false;
  if (filters.blink === "safe" && result.blink >= 2) return false;
  return true;
}

export function validateGen7SosResult(
  request: Gen7SosRequest,
  result: Gen7SosResult,
) {
  assertInteger(
    result.frame,
    "Result frame",
    request.minFrame,
    request.maxFrame,
  );
  if (result.mode === "calls") {
    assertInteger(result.random, "Result random", 0, 0xffff_ffff);
    assertInteger(result.slot, "Result slot", 1, 9);
    assertInteger(result.level, "Result level", 1, 100);
    assertInteger(result.item, "Result item", 0, 3);
    assertInteger(result.bumpedIvMask, "Result IV mask", 0, 0x3f);
    assertInteger(result.advance, "Result advance", 1, 0xffff_ffff);
  } else {
    assertInteger(result.realTimeFrames, "Result realtime", 0, 0xffff_ffff);
    assertInteger(result.ec, "Result EC", 0, 0xffff_ffff);
    assertInteger(result.pid, "Result PID", 0, 0xffff_ffff);
    result.ivs.forEach((value, index) =>
      assertInteger(value, `Result IV ${index}`, 0, 31),
    );
    assertInteger(result.nature, "Result nature", 0, 24);
    assertInteger(result.ability, "Result ability", 1, 3);
    assertInteger(result.gender, "Result gender", 0, 2);
    assertInteger(result.hiddenPower, "Result Hidden Power", 0, 15);
    assertInteger(result.shiny, "Result shiny", 0, 2);
    assertInteger(result.blink, "Result blink", 0, 63);
    assertInteger(result.species, "Result species", 1, 807);
    assertInteger(result.form, "Result form", 0, 255);
    assertInteger(result.level, "Result level", 1, 100);
    assertInteger(result.slot, "Result slot", 1, 9);
    assertInteger(result.item, "Result item", 0, 3);
    assertInteger(result.bumpedIvMask, "Result bumped IV mask", 0, 0x3f);
    assertInteger(
      result.battleAdvance,
      "Result battle advance",
      1,
      0xffff_ffff,
    );
  }
  if (!gen7SosResultPassesFilters(request, result)) {
    throw new RangeError(
      "Gen 7 SOS result does not satisfy its request filters.",
    );
  }
  return result;
}

export function parseGen7SosDecimal(value: string) {
  const normalized = value.trim();
  return normalized === "" ? 0 : Number.parseInt(normalized, 10);
}

export function parseGen7SosHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  return normalized === "" ? 0 : Number.parseInt(normalized, 16);
}

export function formatGen7SosHex32(value: number) {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen7SosHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}
