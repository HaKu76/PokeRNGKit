import {
  GEN7_WILD_AREAS,
  GEN7_WILD_LOCATIONS,
  GEN7_WILD_SLOT_DISTRIBUTIONS,
  GEN7_WILD_SPECIES,
  GEN7_WILD_SPECIALS,
  type Gen7WildArea,
  type Gen7WildCategory,
  type Gen7WildGameVersion,
  type Gen7WildSlot,
  type Gen7WildSpecialEncounter,
} from "./data";

export const GEN7_WILD_API_VERSION = 1;
export const GEN7_WILD_REQUEST_WORDS = 91;
export const GEN7_WILD_RESULT_WORDS = 11;
export const GEN7_WILD_MAX_FRAME = 10_000_000;
export const GEN7_WILD_MAX_RESULTS = 100_000;
export const GEN7_WILD_STEP_SIZE = 16_384;
export const GEN7_WILD_SLOT_COUNT = 11;

export type Gen7WildLanguage = "en" | "ja" | "zh";
export type Gen7WildLead =
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
export type Gen7WildTrigger = "default" | "step" | "menu";
export type Gen7WildShinyFilter = "any" | "shiny" | "square";
export type Gen7WildGenderFilter = "any" | "male" | "female";
export type Gen7WildAbilityFilter = "any" | "1" | "2" | "hidden";
export type Gen7WildBlinkFilter = "any" | "blink" | "safe";
export type Gen7WildIvTuple = [number, number, number, number, number, number];

export interface Gen7WildEncounter {
  category: Gen7WildCategory;
  areaId: string;
  specialId: string | null;
  locationIndex: number;
  npc: number;
  correction: number;
  raining: boolean;
  levelMin: number;
  levelMax: number;
  specialRate: number;
  specialLevel: number;
  slotType: number;
  globalDelayType: number;
  delayTime: number;
  inlineDelayType: number;
  inlineDelayTime: number;
  honeyDelay: number;
  fishing: boolean;
  biteDelay: number;
  platformDelay: number;
  pokemonDelay: number;
  hookedItemThresholds: readonly [number, number];
  wildCry: boolean;
  slots: readonly Gen7WildSlot[];
}

export interface Gen7WildFilters {
  disabled: boolean;
  shiny: Gen7WildShinyFilter;
  gender: Gen7WildGenderFilter;
  ability: Gen7WildAbilityFilter;
  natureMask: number;
  hiddenPowerMask: number;
  ivMin: Gen7WildIvTuple;
  ivMax: Gen7WildIvTuple;
  perfectIvValue: number;
  perfectIvCount: number;
  blink: Gen7WildBlinkFilter;
  slotMask: number;
  specialOnly: boolean;
  level: number;
}

export interface Gen7WildRequest {
  version: Gen7WildGameVersion;
  seed: number;
  minFrame: number;
  maxFrame: number;
  tsv: number;
  trv: number;
  shinyCharm: boolean;
  syncNature: number | null;
  lead: Gen7WildLead;
  considerDelay: boolean;
  encounter: Gen7WildEncounter;
  filters: Gen7WildFilters;
  resultLimit: number;
}

export interface Gen7WildResult {
  frame: number;
  realTimeFrames: number;
  random: bigint;
  ec: number;
  pid: number;
  ivs: Gen7WildIvTuple;
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
  special: boolean;
  specialValue: number | null;
  psv: number;
  prv: number;
}

const VERSION_CODE: Record<Gen7WildGameVersion, number> = {
  sun: 0,
  moon: 1,
  "ultra-sun": 2,
  "ultra-moon": 3,
};
const CATEGORY_CODE: Record<Gen7WildCategory, number> = {
  normal: 0,
  ub: 1,
  "island-scan": 2,
  fishing: 3,
  misc: 4,
  berry: 5,
};
const LEAD_CODE: Record<Gen7WildLead, number> = {
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

const FISHING_ITEM_SLOTS = [
  50, 30, 20, 50, 30, 20, 50, 40, 10, 60, 30, 10, 60, 30, 10, 45, 30, 25, 40,
  30, 30, 80, 19, 1,
] as const;

function familyForVersion(version: Gen7WildGameVersion) {
  return version === "sun" || version === "moon" ? "sm" : "usum";
}

function isMoonVersion(version: Gen7WildGameVersion) {
  return version === "moon" || version === "ultra-moon";
}

function variantSlots(
  area: Gen7WildArea,
  version: Gen7WildGameVersion,
  night: boolean,
) {
  if (isMoonVersion(version))
    return night ? area.variants.moonNight : area.variants.moonDay;
  return night ? area.variants.sunNight : area.variants.sunDay;
}

export function gen7WildStartingFrame(version: Gen7WildGameVersion) {
  return familyForVersion(version) === "sm" ? 418 : 478;
}

export function gen7WildTaskCount(request: Gen7WildRequest) {
  return request.maxFrame - request.minFrame + 1;
}

export function gen7WildAreas(
  version: Gen7WildGameVersion,
  category: Gen7WildCategory,
) {
  const family = familyForVersion(version);
  const areaCategory =
    category === "ub" || category === "island-scan" ? "normal" : category;
  return GEN7_WILD_AREAS.filter(
    (area) => area.family === family && area.category === areaCategory,
  );
}

export function gen7WildSpecials(
  version: Gen7WildGameVersion,
  category: Gen7WildCategory,
) {
  if (category !== "ub" && category !== "island-scan") return [];
  return GEN7_WILD_SPECIALS.filter(
    (entry) => entry.category === category && entry.versions.includes(version),
  );
}

export function gen7WildAreasForSpecial(
  version: Gen7WildGameVersion,
  special: Gen7WildSpecialEncounter,
) {
  const allowed = new Set(special.locations);
  return gen7WildAreas(version, special.category).filter((area) =>
    allowed.has(area.locationIndex),
  );
}

export function gen7WildLocationName(
  area: Pick<Gen7WildArea, "location" | "index" | "mark">,
  language: Gen7WildLanguage,
) {
  const base =
    GEN7_WILD_LOCATIONS[language][area.location] || `Location ${area.location}`;
  const suffix =
    language === "zh" && area.mark
      ? area.mark
      : area.index > 0
        ? String(area.index)
        : "";
  return suffix ? `${base} (${suffix})` : base;
}

export function gen7WildSpeciesName(
  species: number,
  form: number,
  language: Gen7WildLanguage,
) {
  const base = GEN7_WILD_SPECIES[language][species] || `#${species}`;
  if (species === 745 && form > 0) return `${base} (${form})`;
  if (species === 774 && form > 0) return `${base} (${form})`;
  return form > 0 ? `${base} (${form})` : base;
}

function hookedItemThresholds(area: Gen7WildArea, bubbling: boolean) {
  const island = Math.trunc(area.location / 50);
  const ultraBubbling = area.family === "usum" && bubbling;
  const index = (island + (ultraBubbling ? 4 : 0)) * 3;
  return [
    FISHING_ITEM_SLOTS[index] ?? 50,
    (FISHING_ITEM_SLOTS[index] ?? 50) + (FISHING_ITEM_SLOTS[index + 1] ?? 30),
  ] as const;
}

export function gen7WildEncounterFromArea(options: {
  version: Gen7WildGameVersion;
  category: Gen7WildCategory;
  area: Gen7WildArea;
  special?: Gen7WildSpecialEncounter;
  night: boolean;
  bubbling: boolean;
  fishingOverview: boolean;
  trigger: Gen7WildTrigger;
}) {
  const {
    version,
    category,
    area,
    special,
    night,
    bubbling,
    fishingOverview,
    trigger,
  } = options;
  const moon = isMoonVersion(version);
  const slots = [...variantSlots(area, version, night)];
  const fishing = category === "fishing";
  const misc = category === "misc";
  const berry = category === "berry";
  const specialIndex = special?.locations.indexOf(area.locationIndex) ?? -1;
  const specialRate =
    specialIndex >= 0 ? (special?.rates[specialIndex] ?? 0) : fishing ? 80 : 0;
  const specialLevel = special?.level ?? 0;
  const areaLevelMin = moon ? area.levelMinMoon : area.levelMin;
  const areaLevelMax = moon ? area.levelMaxMoon : area.levelMax;
  const fishingLevelMax =
    areaLevelMax + (bubbling && area.family === "usum" ? 5 : 0);
  const triggerType =
    misc && area.delayType1 === 1 && trigger !== "default"
      ? trigger === "step"
        ? 3
        : 4
      : (area.delayType1 ?? 0);
  const timedDelay = fishing
    ? area.lapras
      ? 0
      : -2
    : misc
      ? (area.delay1 ?? 4)
      : berry
        ? 4
        : 8;
  const biteDelay = area.longDelay ? (area.family === "usum" ? 89 : 97) : 78;
  return {
    category,
    areaId: area.id,
    specialId: special?.id ?? null,
    locationIndex: area.locationIndex,
    npc: area.npc,
    correction: area.correction,
    raining: area.raining,
    levelMin: areaLevelMin,
    levelMax: fishing ? fishingLevelMax : areaLevelMax,
    specialRate,
    specialLevel,
    slotType: fishing ? area.slotType + (bubbling ? 1 : 0) : area.slotType,
    globalDelayType: fishing
      ? fishingOverview
        ? 2
        : 1
      : misc
        ? triggerType
        : berry
          ? 1
          : 0,
    delayTime: Math.trunc(timedDelay / 2) + 2,
    inlineDelayType: misc ? (area.delayType2 ?? 1) : 0,
    inlineDelayTime: misc ? Math.trunc((area.delay2 ?? 90) / 2) : 0,
    honeyDelay: area.family === "usum" ? 63 : 93,
    fishing,
    biteDelay,
    platformDelay: bubbling ? 19 : 14,
    pokemonDelay: Math.trunc((timedDelay + 4) / 2),
    hookedItemThresholds: fishing
      ? hookedItemThresholds(area, bubbling)
      : ([0, 0] as const),
    wildCry: area.cry ?? false,
    slots,
  } satisfies Gen7WildEncounter;
}

export function gen7WildSlotChances(encounter: Gen7WildEncounter) {
  return GEN7_WILD_SLOT_DISTRIBUTIONS[encounter.slotType] ?? [];
}

export function gen7WildHiddenPower(ivs: readonly number[]) {
  const reorder = [0, 1, 2, 4, 5, 3];
  const bits = ivs.reduce(
    (sum, iv, index) => sum + ((iv & 1) << reorder[index]),
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

function assertMask(value: number, label: string, maximum: number) {
  assertInteger(value, label, 0, maximum);
}

export function validateGen7WildRequest(request: Gen7WildRequest) {
  if (!(request.version in VERSION_CODE))
    throw new RangeError("Unsupported Gen 7 game version.");
  assertInteger(request.seed, "Seed", 0, 0xffff_ffff);
  assertInteger(
    request.minFrame,
    "Initial Frame",
    gen7WildStartingFrame(request.version),
    GEN7_WILD_MAX_FRAME,
  );
  assertInteger(
    request.maxFrame,
    "Max Frame",
    request.minFrame,
    GEN7_WILD_MAX_FRAME,
  );
  assertInteger(request.tsv, "TSV", 0, 4095);
  assertInteger(request.trv, "TRV", 0, 15);
  assertFlag(request.shinyCharm, "Shiny Charm");
  assertFlag(request.considerDelay, "Consider Delay");
  if (!(request.lead in LEAD_CODE)) throw new RangeError("Unsupported Lead.");
  if (request.syncNature !== null)
    assertInteger(request.syncNature, "Sync Nature", 0, 24);
  if (request.lead === "synchronize" && request.syncNature === null) {
    throw new RangeError("Synchronize requires a Sync Nature.");
  }
  if (request.lead !== "synchronize" && request.syncNature !== null) {
    throw new RangeError("Sync Nature is only available with Synchronize.");
  }

  const encounter = request.encounter;
  if (!(encounter.category in CATEGORY_CODE))
    throw new RangeError("Unsupported Wild category.");
  assertInteger(encounter.locationIndex, "Location", 1, 65_535);
  assertInteger(encounter.npc, "# of NPCs", 0, 100);
  assertInteger(encounter.correction, "Correction", 0, 50);
  assertFlag(encounter.raining, "Raining");
  assertInteger(encounter.levelMin, "Minimum level", 1, 100);
  assertInteger(encounter.levelMax, "Maximum level", encounter.levelMin, 100);
  assertInteger(encounter.specialRate, "Rate", 0, 100);
  assertInteger(encounter.specialLevel, "Special level", 0, 100);
  assertInteger(
    encounter.slotType,
    "Slot distribution",
    0,
    GEN7_WILD_SLOT_DISTRIBUTIONS.length - 1,
  );
  assertInteger(encounter.globalDelayType, "Trigger", 0, 4);
  assertInteger(encounter.delayTime, "Delay", 0, 5_002);
  assertInteger(encounter.inlineDelayType, "Delay2 type", 0, 1);
  assertInteger(encounter.inlineDelayTime, "Delay2", 0, 5_000);
  assertInteger(encounter.honeyDelay, "Honey delay", 63, 93);
  assertFlag(encounter.fishing, "Fishing");
  assertInteger(encounter.biteDelay, "Bite Delay", 0, 100);
  assertInteger(encounter.platformDelay, "Fishing platform delay", 14, 19);
  assertInteger(encounter.pokemonDelay, "Pokemon delay", 1, 2);
  assertInteger(
    encounter.hookedItemThresholds[0],
    "Fishing item threshold",
    0,
    100,
  );
  assertInteger(
    encounter.hookedItemThresholds[1],
    "Fishing item threshold",
    encounter.hookedItemThresholds[0],
    100,
  );
  assertFlag(encounter.wildCry, "Wild Cry");
  if (encounter.slots.length < 1 || encounter.slots.length > 10) {
    throw new RangeError("Wild encounters require between 1 and 10 slots.");
  }
  const distribution = gen7WildSlotChances(encounter);
  if (
    distribution.length !== encounter.slots.length ||
    distribution.reduce((sum, value) => sum + value, 0) !== 100
  ) {
    throw new RangeError(
      "Wild slot distribution must match the encounter slots and total 100%.",
    );
  }
  for (const [index, slot] of encounter.slots.entries()) {
    assertInteger(slot.species, `Slot ${index + 1} species`, 1, 807);
    assertInteger(slot.form, `Slot ${index + 1} form`, 0, 255);
    assertInteger(slot.gender, `Slot ${index + 1} gender`, 0, 224);
    assertFlag(slot.randomGender, `Slot ${index + 1} random gender`);
    assertFlag(slot.fixedThreeIv, `Slot ${index + 1} fixed 3IV`);
    assertFlag(slot.electric, `Slot ${index + 1} electric type`);
    assertFlag(slot.steel, `Slot ${index + 1} steel type`);
  }

  const filters = request.filters;
  assertFlag(filters.disabled, "Ignore Filters");
  assertMask(filters.natureMask, "Nature filter", 0x1ff_ffff);
  assertMask(filters.hiddenPowerMask, "Hidden Power filter", 0xffff);
  assertMask(filters.slotMask, "Slot filter", 0x7ff);
  assertFlag(filters.specialOnly, "Special Only");
  assertInteger(filters.level, "Level filter", 0, 100);
  filters.ivMin.forEach((value, index) =>
    assertInteger(value, `IV minimum ${index}`, 0, 31),
  );
  filters.ivMax.forEach((value, index) => {
    assertInteger(value, `IV maximum ${index}`, 0, 31);
    if (value < filters.ivMin[index])
      throw new RangeError(`IV range ${index} is reversed.`);
  });
  assertInteger(filters.perfectIvValue, "Perfect IV threshold", 0, 31);
  assertInteger(filters.perfectIvCount, "Perfect IV count", 0, 6);
  assertInteger(request.resultLimit, "Result limit", 1, GEN7_WILD_MAX_RESULTS);
  return request;
}

function packedSlotMetadata(slot?: Gen7WildSlot) {
  if (!slot) return 0;
  return (
    slot.gender |
    (Number(slot.randomGender) << 8) |
    (Number(slot.fixedThreeIv) << 9) |
    (Number(slot.electric) << 10) |
    (Number(slot.steel) << 11)
  );
}

export function encodeGen7WildRequest(request: Gen7WildRequest) {
  validateGen7WildRequest(request);
  const special = request.encounter.specialId
    ? GEN7_WILD_SPECIALS.find(
        (entry) => entry.id === request.encounter.specialId,
      )
    : undefined;
  const species = Array<number>(GEN7_WILD_SLOT_COUNT).fill(0);
  const metadata = Array<number>(GEN7_WILD_SLOT_COUNT).fill(0);
  if (special) {
    species[0] = special.species | (special.form << 11);
    metadata[0] = packedSlotMetadata({
      species: special.species,
      form: special.form,
      gender: special.gender,
      randomGender: special.randomGender,
      fixedThreeIv: special.fixedThreeIv,
      electric: false,
      steel: false,
    });
  }
  request.encounter.slots.forEach((slot, index) => {
    species[index + 1] = slot.species | (slot.form << 11);
    metadata[index + 1] = packedSlotMetadata(slot);
  });
  const distribution = [...gen7WildSlotChances(request.encounter)];
  while (distribution.length < 12) distribution.push(0);
  const filters = request.filters;
  const words = [
    VERSION_CODE[request.version],
    request.seed,
    request.minFrame,
    request.maxFrame,
    request.tsv,
    request.trv,
    Number(request.shinyCharm),
    request.syncNature ?? 0xff,
    LEAD_CODE[request.lead],
    request.encounter.npc,
    Number(request.encounter.raining),
    Number(request.considerDelay),
    CATEGORY_CODE[request.encounter.category],
    request.encounter.specialRate,
    request.encounter.levelMin,
    request.encounter.levelMax,
    request.encounter.specialLevel,
    request.encounter.slotType,
    request.encounter.globalDelayType,
    request.encounter.delayTime,
    request.encounter.inlineDelayType,
    request.encounter.inlineDelayTime,
    request.encounter.correction,
    request.encounter.honeyDelay,
    Number(request.encounter.fishing),
    request.encounter.biteDelay,
    request.encounter.platformDelay,
    request.encounter.pokemonDelay,
    request.encounter.hookedItemThresholds[0],
    request.encounter.hookedItemThresholds[1],
    Number(request.encounter.wildCry),
    ...species,
    ...metadata,
    ...distribution,
    Number(filters.disabled),
    Number(filters.shiny !== "any"),
    Number(filters.shiny === "square"),
    filters.gender === "any" ? 0 : filters.gender === "male" ? 1 : 2,
    filters.ability === "any"
      ? 0
      : filters.ability === "1"
        ? 1
        : filters.ability === "2"
          ? 2
          : 3,
    filters.natureMask,
    filters.hiddenPowerMask,
    ...filters.ivMin,
    ...filters.ivMax,
    filters.perfectIvValue,
    filters.perfectIvCount,
    filters.blink === "any" ? 0 : filters.blink === "blink" ? 1 : 2,
    filters.slotMask,
    Number(filters.specialOnly),
    filters.level,
    request.resultLimit,
  ];
  if (words.length !== GEN7_WILD_REQUEST_WORDS) {
    throw new Error(`Gen 7 Wild request ABI mismatch: ${words.length}.`);
  }
  return new Uint32Array(words.map((word) => word >>> 0));
}

export function decodeGen7WildResults(buffer: ArrayBuffer) {
  const words = new Uint32Array(buffer);
  if (words.length % GEN7_WILD_RESULT_WORDS !== 0) {
    throw new RangeError("Invalid Gen 7 Wild result buffer length.");
  }
  const results: Gen7WildResult[] = [];
  for (
    let offset = 0;
    offset < words.length;
    offset += GEN7_WILD_RESULT_WORDS
  ) {
    const ivWord = words[offset + 6];
    const meta = words[offset + 7];
    const encounter = words[offset + 9];
    const pid = words[offset + 5];
    const xorValue = (pid >>> 16) ^ (pid & 0xffff);
    results.push({
      frame: words[offset],
      realTimeFrames: words[offset + 1],
      random: (BigInt(words[offset + 3]) << 32n) | BigInt(words[offset + 2]),
      ec: words[offset + 4],
      pid,
      ivs: [0, 1, 2, 3, 4, 5].map(
        (index) => (ivWord >>> (index * 5)) & 0x1f,
      ) as Gen7WildIvTuple,
      nature: meta & 0x1f,
      ability: (meta >>> 5) & 0x3,
      gender: (meta >>> 7) & 0x3,
      hiddenPower: (meta >>> 9) & 0xf,
      shiny: (meta >>> 13) & 0x3,
      synchronize: Boolean((meta >>> 15) & 1),
      blink: (meta >>> 16) & 0x3f,
      special: Boolean((meta >>> 22) & 1),
      delay: words[offset + 8] | 0,
      species: encounter & 0x7ff,
      form: (encounter >>> 11) & 0xff,
      level: (encounter >>> 19) & 0x7f,
      slot: (encounter >>> 26) & 0xf,
      item: (encounter >>> 30) & 0x3,
      specialValue: words[offset + 10] === 0xff ? null : words[offset + 10],
      psv: xorValue >>> 4,
      prv: xorValue & 0xf,
    });
  }
  return results;
}

export function gen7WildResultPassesFilters(
  request: Gen7WildRequest,
  result: Gen7WildResult,
) {
  const filters = request.filters;
  if (filters.disabled) return true;
  if (filters.shiny !== "any" && result.shiny === 0) return false;
  if (filters.shiny === "square" && result.shiny !== 2) return false;
  if (
    filters.gender !== "any" &&
    result.gender !== (filters.gender === "male" ? 1 : 2)
  )
    return false;
  if (filters.ability !== "any") {
    const ability =
      filters.ability === "1" ? 1 : filters.ability === "2" ? 2 : 3;
    if (result.ability !== ability) return false;
  }
  if (
    filters.natureMask !== 0 &&
    (filters.natureMask & (1 << result.nature)) === 0
  )
    return false;
  if (
    filters.hiddenPowerMask !== 0 &&
    (filters.hiddenPowerMask & (1 << result.hiddenPower)) === 0
  )
    return false;
  if (filters.slotMask !== 0 && (filters.slotMask & (1 << result.slot)) === 0)
    return false;
  if (filters.specialOnly && !result.special) return false;
  if (filters.level !== 0 && result.level !== filters.level) return false;
  let perfect = 0;
  for (let index = 0; index < 6; index++) {
    if (
      result.ivs[index] < filters.ivMin[index] ||
      result.ivs[index] > filters.ivMax[index]
    )
      return false;
    if (result.ivs[index] >= filters.perfectIvValue) perfect++;
  }
  if (perfect < filters.perfectIvCount) return false;
  if (filters.blink === "blink" && result.blink < 4) return false;
  if (filters.blink === "safe" && result.blink >= 2) return false;
  return true;
}

export function validateGen7WildResult(
  request: Gen7WildRequest,
  result: Gen7WildResult,
) {
  assertInteger(
    result.frame,
    "Result frame",
    request.minFrame,
    request.maxFrame,
  );
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
  assertInteger(result.slot, "Result slot", 0, 10);
  assertInteger(result.item, "Result item", 0, 3);
  if (!gen7WildResultPassesFilters(request, result)) {
    throw new RangeError(
      "Gen 7 Wild result does not satisfy its request filters.",
    );
  }
  return result;
}

export function parseGen7WildDecimal(value: string) {
  const normalized = value.trim();
  return normalized === "" ? 0 : Number.parseInt(normalized, 10);
}

export function parseGen7WildHex(value: string) {
  const normalized = value.trim().replace(/^0x/i, "");
  return normalized === "" ? 0 : Number.parseInt(normalized, 16);
}

export function formatGen7WildHex32(value: number) {
  return value.toString(16).toUpperCase().padStart(8, "0");
}

export function formatGen7WildHex64(value: bigint) {
  return value.toString(16).toUpperCase().padStart(16, "0");
}
