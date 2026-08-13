import {
  GEN4_WILD_AREAS,
  GEN4_WILD_ITEMS,
  GEN4_WILD_LOCATION_NAMES,
  GEN4_WILD_PERSONAL_BASE64,
  type Gen4WildArea as DataGen4WildArea,
  type Gen4WildGame,
  type Gen4WildSlot,
} from "./data";

export const GEN4_WILD_API_VERSION = 1;
export const GEN4_WILD_CHUNK_SIZE = 100_000;
export const GEN4_WILD_SEARCHER_CHUNK_SIZE = 10_000;
export const GEN4_WILD_MAX_TOTAL_STATES = 2_000_000;
export const GEN4_WILD_MAX_RESULTS = 250_000;
export const GEN4_WILD_NATURE_MASK_ALL = 0x1ff_ffff;
export const GEN4_WILD_HIDDEN_POWER_MASK_ALL = 0xffff;

const GEN4_WILD_GAMES: readonly Gen4WildGame[] = [
  "diamond",
  "pearl",
  "platinum",
  "heartgold",
  "soulsilver",
];
const GEN4_WILD_METHODS: readonly Gen4WildMethod[] = [
  "methodJ",
  "methodK",
  "honeyTree",
  "pokeRadar",
];
const GEN4_WILD_LEADS: readonly Gen4WildLead[] = [
  "none",
  "synchronize",
  "cute-charm-f",
  "cute-charm-m",
  "compound-eyes",
  "arena-trap",
  "illuminate",
  "no-guard",
  "sticky-hold",
  "suction-cups",
  "hustle",
  "pressure",
  "vital-spirit",
  "magnet-pull",
  "static",
];

export type Gen4WildMethod = "methodJ" | "methodK" | "honeyTree" | "pokeRadar";
export type Gen4WildEncounter =
  | "grass"
  | "surfing"
  | "rock-smash"
  | "old-rod"
  | "good-rod"
  | "super-rod"
  | "honey-tree"
  | "bug-catching-contest"
  | "headbutt"
  | "headbutt-alt"
  | "headbutt-special";
export type Gen4WildArea = Omit<DataGen4WildArea, "encounter"> & {
  encounter: Gen4WildEncounter;
};
export type Gen4WildLead =
  | "none"
  | "synchronize"
  | "cute-charm-f"
  | "cute-charm-m"
  | "compound-eyes"
  | "arena-trap"
  | "illuminate"
  | "no-guard"
  | "sticky-hold"
  | "suction-cups"
  | "hustle"
  | "pressure"
  | "vital-spirit"
  | "magnet-pull"
  | "static";
export type Gen4WildShiny = "any" | "notShiny" | "shiny";
export type Gen4WildGender = "any" | "male" | "female" | "genderless";
export type Gen4WildAbility = "any" | "first" | "second";
export type Gen4WildTime = "morning" | "day" | "night";
export type Gen4WildDualSlot =
  "none" | "ruby" | "sapphire" | "firered" | "leafgreen" | "emerald";
export type Gen4WildRadio = "none" | "hoenn" | "sinnoh" | "mysterious";
export type Gen4IvTuple = [number, number, number, number, number, number];

export interface Gen4WildSettings {
  time: Gen4WildTime;
  swarm: boolean;
  dualSlot: Gen4WildDualSlot;
  pokeRadar: boolean;
  pokeRadarShiny: boolean;
  radio: Gen4WildRadio;
  feebasTile: boolean;
  replacement: readonly [number, number];
  safariBlocks: readonly [number, number, number, number];
}

export const DEFAULT_GEN4_WILD_SETTINGS: Gen4WildSettings = {
  time: "morning",
  swarm: false,
  dualSlot: "none",
  pokeRadar: false,
  pokeRadarShiny: false,
  radio: "none",
  feebasTile: false,
  replacement: [0, 0],
  safariBlocks: [0, 0, 0, 0],
};

export interface Gen4WildFilters {
  shiny: Gen4WildShiny;
  gender: Gen4WildGender;
  ability: Gen4WildAbility;
  natureMask: number;
  hiddenPowerMask: number;
  encounterSlotMask: number;
  levelMin: number;
  levelMax: number;
  ivMin: Gen4IvTuple;
  ivMax: Gen4IvTuple;
}

export interface Gen4GameProfile {
  version: Gen4WildGame;
  tid: number;
  sid: number;
  nationalDex: boolean;
  unownDiscovered: readonly boolean[];
  unownPuzzles: readonly boolean[];
}

interface Gen4WildCommonRequest {
  method: Gen4WildMethod;
  lead: Gen4WildLead;
  synchronizeNature: number;
  feebasTile: boolean;
  pokeRadarShiny: boolean;
  unownRadio: boolean;
  happiness: number;
  fixedSlot: number;
  profile: Gen4GameProfile;
  area: Gen4WildArea;
  filters: Gen4WildFilters;
}

export interface Gen4WildGeneratorRequest extends Gen4WildCommonRequest {
  seed: number;
  initialAdvances: number;
  maxAdvances: number;
  offset: number;
}

export interface Gen4WildSearcherRequest extends Gen4WildCommonRequest {
  minAdvance: number;
  maxAdvance: number;
  minDelay: number;
  maxDelay: number;
}

export interface Gen4WildState {
  advances: number;
  battleAdvances: number;
  pid: number;
  ivs: Gen4IvTuple;
  ability: number;
  gender: number;
  level: number;
  nature: number;
  shiny: number;
  hiddenPower: number;
  hiddenPowerStrength: number;
  encounterSlot: number;
  species: number;
  form: number;
  item: number;
  call: number;
  chatot: number;
}

export interface Gen4WildSearcherState extends Gen4WildState {
  seed: number;
  delay: number;
  hour: number;
}

export interface Gen4WildChunk {
  index: number;
  initialAdvances: number;
  maxAdvances: number;
  stateCount: number;
}

export interface Gen4WildSearcherChunk {
  index: number;
  startIndex: number;
  stateCount: number;
}

interface Replacement {
  index: number;
  species: number;
}

interface SafariVariants {
  normal: readonly (readonly (readonly [number, number])[])[];
  block: readonly (readonly (readonly [number, number])[])[];
  requirements: readonly (readonly [number, number, number, number])[];
}

interface AreaVariants {
  swarm?: readonly Replacement[];
  day?: readonly Replacement[];
  night?: readonly Replacement[];
  radar?: readonly Replacement[];
  dual?: Partial<
    Record<Exclude<Gen4WildDualSlot, "none">, readonly Replacement[]>
  >;
  timeSlots?: readonly (readonly Gen4WildSlot[])[];
  hoenn?: readonly Replacement[];
  sinnoh?: readonly Replacement[];
  feebas?: { species: number; minLevel: number; maxLevel: number };
  honeyTree?: boolean;
  safari?: SafariVariants;
  dexGroup?: "pre" | "national";
}

export const GEN4_WILD_ENCOUNTERS: Gen4WildEncounter[] = [
  "grass",
  "honey-tree",
  "rock-smash",
  "bug-catching-contest",
  "headbutt",
  "headbutt-alt",
  "headbutt-special",
  "surfing",
  "old-rod",
  "good-rod",
  "super-rod",
];

const typedAreas = GEN4_WILD_AREAS as readonly Gen4WildArea[];
export const GEN4_WILD_AREAS_BY_GAME: Record<
  Gen4WildGame,
  readonly Gen4WildArea[]
> = {
  diamond: typedAreas.filter((area) => area.game === "diamond"),
  pearl: typedAreas.filter((area) => area.game === "pearl"),
  platinum: typedAreas.filter((area) => area.game === "platinum"),
  heartgold: typedAreas.filter((area) => area.game === "heartgold"),
  soulsilver: typedAreas.filter((area) => area.game === "soulsilver"),
};

const honeyTreeMapIds = [
  145, 146, 147, 148, 149, 150, 156, 157, 159, 160, 161, 162, 163, 164, 167,
  169, 170, 7, 8, 9, 183,
] as const;
const greatMarshDp = [
  55, 183, 194, 195, 298, 315, 397, 399, 400, 451, 453, 455,
];
const greatMarshDpDex = [
  46, 55, 102, 115, 193, 285, 315, 316, 397, 451, 452, 453, 454, 455,
];
const greatMarshPt = [114, 193, 194, 195, 357, 451, 453, 455];
const greatMarshPtDex = [
  46, 102, 114, 115, 193, 195, 285, 316, 352, 357, 451, 452, 453, 454, 455,
];
const trophyGardenDp = [
  35, 39, 52, 113, 133, 137, 173, 174, 183, 298, 311, 312, 351, 438, 439, 440,
];
const trophyGardenPt = [
  35, 39, 52, 113, 132, 133, 173, 174, 183, 298, 311, 312, 351, 438, 439, 440,
];

const personalCache: Partial<Record<Gen4WildGame, Uint8Array>> = {};
const itemNameCache = Object.fromEntries(
  Object.entries(GEN4_WILD_ITEMS).map(([language, entries]) => [
    language,
    new Map(
      entries.map((entry) => {
        const separator = entry.indexOf(",");
        return [Number(entry.slice(0, separator)), entry.slice(separator + 1)];
      }),
    ),
  ]),
) as Record<"en" | "ja" | "zh", Map<number, string>>;

function personal(version: Gen4WildGame) {
  return (personalCache[version] ??= Uint8Array.from(
    atob(GEN4_WILD_PERSONAL_BASE64[version]),
    (character) => character.charCodeAt(0),
  ));
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function slotForSpecies(
  version: Gen4WildGame,
  species: number,
  template: Pick<Gen4WildSlot, "minLevel" | "maxLevel">,
): Gen4WildSlot {
  const bytes = personal(version);
  const offset = species * 0x2c;
  return {
    species,
    form: 0,
    minLevel: template.minLevel,
    maxLevel: template.maxLevel,
    stats: [
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
      bytes[offset + 4],
      bytes[offset + 5],
    ],
    types: [bytes[offset + 6], bytes[offset + 7]],
    items: [readU16(bytes, offset + 0x0c), readU16(bytes, offset + 0x0e), 0],
    genderRatio: bytes[offset + 0x10],
    abilities: [
      bytes[offset + 0x16],
      bytes[offset + 0x17] || bytes[offset + 0x16],
      0,
    ],
  };
}

function applyReplacements(
  slots: Gen4WildSlot[],
  replacements: readonly Replacement[] | undefined,
  version: Gen4WildGame,
) {
  for (const replacement of replacements ?? []) {
    if (!slots[replacement.index] || replacement.species === 0) continue;
    slots[replacement.index] = slotForSpecies(
      version,
      replacement.species,
      slots[replacement.index],
    );
  }
}

function timeIndex(time: Gen4WildTime) {
  return { morning: 0, day: 1, night: 2 }[time];
}

function isHgss(version: Gen4WildGame) {
  return version === "heartgold" || version === "soulsilver";
}

function isFishing(encounter: Gen4WildEncounter) {
  return (
    encounter === "old-rod" ||
    encounter === "good-rod" ||
    encounter === "super-rod"
  );
}

function unlockedUnown(profile: Gen4GameProfile) {
  const groups = [
    [0, 9],
    [17, 21],
    [10, 16],
    [22, 25],
  ] as const;
  const result: number[] = [];
  profile.unownPuzzles.forEach((complete, index) => {
    if (!complete) return;
    for (let form = groups[index][0]; form <= groups[index][1]; form++) {
      result.push(form);
    }
  });
  return result;
}

function areaAvailable(area: Gen4WildArea, profile: Gen4GameProfile) {
  const variants = (area.variants ?? {}) as AreaVariants;
  if (
    variants.dexGroup &&
    variants.dexGroup !== (profile.nationalDex ? "national" : "pre")
  ) {
    return false;
  }
  if (!isHgss(profile.version) || area.encounter !== "grass") return true;
  const unlocked = unlockedUnown(profile);
  if (area.location === 10) {
    return (
      unlocked.length === 26 &&
      unlocked.every((form) => profile.unownDiscovered[form])
    );
  }
  if (area.location === 11) return unlocked.length > 0;
  return true;
}

function resolveHoneySlots(area: Gen4WildArea, profile: Gen4GameProfile) {
  const treeIds = [
    (profile.sid >> 8) % 21,
    (profile.sid & 0xff) % 21,
    (profile.tid >> 8) % 21,
    (profile.tid & 0xff) % 21,
  ];
  for (let index = 1; index < treeIds.length; index++) {
    for (let previous = 0; previous < index; previous++) {
      if (treeIds[previous] === treeIds[index])
        treeIds[index] = (treeIds[index] + 1) % 21;
    }
  }
  const currentTree = honeyTreeMapIds.indexOf(
    area.location as (typeof honeyTreeMapIds)[number],
  );
  const source = area.slots.slice(0, treeIds.includes(currentTree) ? 18 : 12);
  const unique: Gen4WildSlot[] = [];
  for (const slot of source) {
    if (!unique.some((entry) => entry.species === slot.species))
      unique.push(slot);
  }
  return unique;
}

function resolveSafariSlots(
  area: Gen4WildArea,
  safari: SafariVariants,
  settings: Gen4WildSettings,
) {
  const selectedTime = timeIndex(settings.time);
  const normal = safari.normal[selectedTime];
  const block = safari.block[selectedTime];
  const slots: Gen4WildSlot[] = [];
  let blockIndex = 0;
  for (let index = 0; index < 10; index++) {
    let [species, level] = normal[index];
    for (; blockIndex < block.length; blockIndex++) {
      const [type1, quantity1, type2, quantity2] =
        safari.requirements[blockIndex];
      const available = [0, ...settings.safariBlocks];
      if (available[type1] >= quantity1 && available[type2] >= quantity2) {
        [species, level] = block[blockIndex];
        blockIndex++;
        break;
      }
    }
    slots.push(
      slotForSpecies(area.game, species, { minLevel: level, maxLevel: level }),
    );
  }
  return slots;
}

export function resolveGen4WildArea(
  area: Gen4WildArea,
  profile: Gen4GameProfile,
  settings: Gen4WildSettings,
): Gen4WildArea {
  const variants = (area.variants ?? {}) as AreaVariants;
  if (variants.honeyTree) {
    return { ...area, slots: resolveHoneySlots(area, profile) };
  }
  if (variants.safari) {
    return {
      ...area,
      slots: resolveSafariSlots(area, variants.safari, settings),
    };
  }

  let slots = [...area.slots];
  if (!isHgss(profile.version)) {
    if (settings.swarm) applyReplacements(slots, variants.swarm, area.game);
    if (settings.time === "day")
      applyReplacements(slots, variants.day, area.game);
    if (settings.time === "night")
      applyReplacements(slots, variants.night, area.game);
    if (settings.pokeRadar) applyReplacements(slots, variants.radar, area.game);
    if (area.location >= 23 && area.location <= 28 && settings.replacement[0]) {
      applyReplacements(
        slots,
        [6, 7].map((index) => ({ index, species: settings.replacement[0] })),
        area.game,
      );
    }
    if (
      area.location === 117 &&
      settings.replacement[0] &&
      settings.replacement[1]
    ) {
      applyReplacements(
        slots,
        [
          { index: 6, species: settings.replacement[0] },
          { index: 7, species: settings.replacement[1] },
        ],
        area.game,
      );
    }
    if (settings.dualSlot !== "none") {
      applyReplacements(slots, variants.dual?.[settings.dualSlot], area.game);
    }
    if (settings.feebasTile && variants.feebas) {
      slots.push(
        slotForSpecies(area.game, variants.feebas.species, variants.feebas),
      );
    }
  } else {
    if (variants.timeSlots)
      slots = [...variants.timeSlots[timeIndex(settings.time)]];
    if (settings.radio === "hoenn")
      applyReplacements(slots, variants.hoenn, area.game);
    if (settings.radio === "sinnoh")
      applyReplacements(slots, variants.sinnoh, area.game);
    if (settings.time === "night")
      applyReplacements(slots, variants.night, area.game);
    if (settings.swarm) applyReplacements(slots, variants.swarm, area.game);
  }
  return { ...area, slots };
}

export function gen4WildAreasFor(
  profile: Gen4GameProfile,
  encounter: Gen4WildEncounter,
  settings: Gen4WildSettings,
) {
  return GEN4_WILD_AREAS_BY_GAME[profile.version]
    .filter(
      (area) => area.encounter === encounter && areaAvailable(area, profile),
    )
    .map((area) => resolveGen4WildArea(area, profile, settings));
}

export function gen4WildReplacementOptions(
  profile: Gen4GameProfile,
  location: number,
) {
  if (location >= 23 && location <= 28) {
    if (profile.version === "platinum") {
      return profile.nationalDex ? greatMarshPtDex : greatMarshPt;
    }
    return profile.nationalDex ? greatMarshDpDex : greatMarshDp;
  }
  if (location === 117) {
    return profile.version === "platinum" ? trophyGardenPt : trophyGardenDp;
  }
  return [];
}

export function gen4WildMethodFor(
  profile: Gen4GameProfile,
  encounter: Gen4WildEncounter,
  settings: Gen4WildSettings,
): Gen4WildMethod {
  if (encounter === "honey-tree") return "honeyTree";
  if (settings.pokeRadar) return "pokeRadar";
  return isHgss(profile.version) ? "methodK" : "methodJ";
}

export function gen4WildMethodToWasm(method: Gen4WildMethod) {
  return { methodJ: 2, methodK: 3, pokeRadar: 4, honeyTree: 5 }[method];
}

export function gen4WildLeadToWasm(lead: Gen4WildLead, nature: number) {
  if (lead === "synchronize") return nature;
  return {
    none: 255,
    "cute-charm-f": 25,
    "cute-charm-m": 26,
    "magnet-pull": 27,
    static: 28,
    pressure: 32,
    hustle: 32,
    "vital-spirit": 32,
    "suction-cups": 33,
    "sticky-hold": 33,
    "compound-eyes": 34,
    "arena-trap": 35,
    illuminate: 35,
    "no-guard": 35,
  }[lead];
}

export function gen4WildEncounterToWasm(encounter: Gen4WildEncounter) {
  return {
    grass: 0,
    "rock-smash": 3,
    surfing: 4,
    "old-rod": 6,
    "good-rod": 7,
    "super-rod": 8,
    "honey-tree": 11,
    "bug-catching-contest": 12,
    headbutt: 13,
    "headbutt-alt": 14,
    "headbutt-special": 15,
  }[encounter];
}

export function gen4WildFilterCode(
  value: Gen4WildShiny | Gen4WildGender | Gen4WildAbility,
) {
  return {
    any: 0,
    notShiny: 1,
    shiny: 2,
    male: 1,
    female: 2,
    genderless: 3,
    first: 1,
    second: 2,
  }[value];
}

export function gen4WildSearcherCombinationCount(
  request: Gen4WildSearcherRequest,
) {
  return request.filters.ivMin.reduce(
    (total, min, index) => total * (request.filters.ivMax[index] - min + 1),
    1,
  );
}

export function getGen4WildItemName(language: string, item: number) {
  const key = language.startsWith("zh")
    ? "zh"
    : language.startsWith("ja")
      ? "ja"
      : "en";
  return itemNameCache[key].get(item) ?? String(item);
}

export function getGen4WildLocationName(
  language: string,
  area: Pick<Gen4WildArea, "game" | "location" | "name">,
) {
  const key = language.startsWith("zh")
    ? "zh"
    : language.startsWith("ja")
      ? "ja"
      : "en";
  const group = isHgss(area.game) ? "hgss" : "dppt";
  const names: Readonly<Record<string, string>> =
    GEN4_WILD_LOCATION_NAMES[key][group];
  return names[String(area.location)] ?? area.name;
}

export function packGen4WildSlots(slots: readonly Gen4WildSlot[]) {
  const words = new Uint32Array(slots.length * 19);
  slots.forEach((slot, index) => {
    const offset = index * 19;
    words[offset] = slot.species;
    words[offset + 1] = slot.form;
    words[offset + 2] = slot.minLevel;
    words[offset + 3] = slot.maxLevel;
    words.set(slot.stats, offset + 4);
    words.set(slot.types, offset + 10);
    words[offset + 12] = slot.genderRatio;
    words.set(slot.items, offset + 13);
    words.set(slot.abilities, offset + 16);
  });
  return words;
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function validU16(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

function validateProfile(profile: Gen4GameProfile) {
  return (
    GEN4_WILD_GAMES.includes(profile.version) &&
    validU16(profile.tid) &&
    validU16(profile.sid) &&
    typeof profile.nationalDex === "boolean" &&
    profile.unownDiscovered.length === 26 &&
    profile.unownDiscovered.every((value) => typeof value === "boolean") &&
    profile.unownPuzzles.length === 4 &&
    profile.unownPuzzles.every((value) => typeof value === "boolean")
  );
}

function validateArea(area: Gen4WildArea) {
  return (
    GEN4_WILD_GAMES.includes(area.game) &&
    GEN4_WILD_ENCOUNTERS.includes(area.encounter) &&
    Number.isInteger(area.location) &&
    area.location >= 0 &&
    area.location <= 0xff &&
    Number.isInteger(area.rate) &&
    area.rate >= 0 &&
    area.rate <= 0xff &&
    area.slots.length >= 1 &&
    area.slots.length <= 12 &&
    area.slots.every(
      (slot) =>
        Number.isInteger(slot.species) &&
        slot.species >= 1 &&
        slot.species <= 493 &&
        Number.isInteger(slot.form) &&
        slot.form >= 0 &&
        slot.form <= 0xff &&
        Number.isInteger(slot.minLevel) &&
        Number.isInteger(slot.maxLevel) &&
        slot.minLevel >= 1 &&
        slot.maxLevel <= 100 &&
        slot.minLevel <= slot.maxLevel &&
        slot.stats.length === 6 &&
        slot.stats.every(
          (value) => Number.isInteger(value) && value >= 1 && value <= 0xff,
        ) &&
        slot.types.length === 2 &&
        slot.types.every(
          (value) => Number.isInteger(value) && value >= 0 && value <= 17,
        ) &&
        Number.isInteger(slot.genderRatio) &&
        slot.genderRatio >= 0 &&
        slot.genderRatio <= 0xff &&
        slot.items.length === 3 &&
        slot.items.every(validU16) &&
        slot.abilities.length === 3 &&
        slot.abilities.every(validU16),
    )
  );
}

function validateFilters(filters: Gen4WildFilters, slotCount: number) {
  const errors: string[] = [];
  const fullSlotMask = (1 << slotCount) - 1;
  if (
    !Number.isInteger(filters.natureMask) ||
    filters.natureMask < 1 ||
    filters.natureMask > GEN4_WILD_NATURE_MASK_ALL
  )
    errors.push("nature");
  if (
    !Number.isInteger(filters.hiddenPowerMask) ||
    filters.hiddenPowerMask < 1 ||
    filters.hiddenPowerMask > GEN4_WILD_HIDDEN_POWER_MASK_ALL
  )
    errors.push("hiddenPower");
  if (
    slotCount < 1 ||
    slotCount > 12 ||
    !Number.isInteger(filters.encounterSlotMask) ||
    filters.encounterSlotMask < 1 ||
    filters.encounterSlotMask > fullSlotMask
  )
    errors.push("encounterSlot");
  if (
    !Number.isInteger(filters.levelMin) ||
    !Number.isInteger(filters.levelMax) ||
    filters.levelMin < 1 ||
    filters.levelMax > 100 ||
    filters.levelMin > filters.levelMax
  )
    errors.push("level");
  filters.ivMin.forEach((minimum, index) => {
    const maximum = filters.ivMax[index];
    if (
      !Number.isInteger(minimum) ||
      !Number.isInteger(maximum) ||
      minimum < 0 ||
      maximum > 31 ||
      minimum > maximum
    )
      errors.push(`iv${index}`);
  });
  return errors;
}

function validateCommonRequest(
  request: Gen4WildGeneratorRequest | Gen4WildSearcherRequest,
) {
  const errors = validateFilters(request.filters, request.area.slots.length);
  if (!validateProfile(request.profile)) errors.push("profile");
  if (
    !validateArea(request.area) ||
    request.area.game !== request.profile.version
  )
    errors.push("area");
  if (!GEN4_WILD_METHODS.includes(request.method)) errors.push("method");
  if (!GEN4_WILD_LEADS.includes(request.lead)) errors.push("lead");
  if (
    typeof request.feebasTile !== "boolean" ||
    typeof request.pokeRadarShiny !== "boolean" ||
    typeof request.unownRadio !== "boolean"
  )
    errors.push("settings");
  if (
    !Number.isInteger(request.synchronizeNature) ||
    request.synchronizeNature < 0 ||
    request.synchronizeNature > 24
  )
    errors.push("synchronizeNature");
  if (![0, 20, 30, 40, 50].includes(request.happiness))
    errors.push("happiness");
  const hgss = isHgss(request.profile.version);
  const honeyTree = request.area.encounter === "honey-tree";
  if (
    (hgss && request.method !== "methodK") ||
    (!hgss && request.method === "methodK") ||
    (honeyTree && request.method !== "honeyTree") ||
    (!honeyTree && request.method === "honeyTree") ||
    (request.method === "pokeRadar" && request.area.encounter !== "grass")
  )
    errors.push("method");
  const validFixedSlot =
    Number.isInteger(request.fixedSlot) &&
    request.fixedSlot >= 0 &&
    request.fixedSlot < request.area.slots.length;
  if (
    !validFixedSlot ||
    ((request.method === "honeyTree" || request.method === "pokeRadar") &&
      request.filters.encounterSlotMask !== 1 << request.fixedSlot)
  )
    errors.push("fixedSlot");
  if (request.pokeRadarShiny && request.method !== "pokeRadar") {
    errors.push("pokeRadarShiny");
  }
  if (
    (request.area.encounter === "bug-catching-contest" ||
      (hgss && request.area.location >= 148 && request.area.location <= 160)) &&
    "minAdvance" in request &&
    !request.filters.ivMin.includes(31)
  ) {
    errors.push("flawlessIv");
  }
  return errors;
}

export function validateGen4WildGeneratorRequest(
  request: Gen4WildGeneratorRequest,
) {
  const errors = validateCommonRequest(request);
  if (!validU32(request.seed)) errors.push("seed");
  if (!validU32(request.initialAdvances)) errors.push("initialAdvances");
  if (
    !validU32(request.maxAdvances) ||
    request.maxAdvances + 1 > GEN4_WILD_MAX_TOTAL_STATES
  )
    errors.push("maxAdvances");
  if (!validU32(request.offset)) errors.push("offset");
  if (
    request.initialAdvances + request.offset + request.maxAdvances >
    0xffff_ffff
  )
    errors.push("advanceRange");
  return errors;
}

export function validateGen4WildSearcherRequest(
  request: Gen4WildSearcherRequest,
) {
  const errors = validateCommonRequest(request);
  if (
    !validU32(request.minAdvance) ||
    !validU32(request.maxAdvance) ||
    request.minAdvance > request.maxAdvance
  )
    errors.push("advanceRange");
  if (
    !validU16(request.minDelay) ||
    !validU16(request.maxDelay) ||
    request.minDelay > request.maxDelay
  )
    errors.push("delayRange");
  if (gen4WildSearcherCombinationCount(request) > GEN4_WILD_MAX_TOTAL_STATES) {
    errors.push("searchRange");
  }
  return errors;
}

export function createGen4WildChunks(
  request: Gen4WildGeneratorRequest,
  chunkSize = GEN4_WILD_CHUNK_SIZE,
) {
  const chunks: Gen4WildChunk[] = [];
  const total = request.maxAdvances + 1;
  for (let start = 0, index = 0; start < total; index++) {
    const stateCount = Math.min(chunkSize, total - start);
    chunks.push({
      index,
      initialAdvances: request.initialAdvances + start,
      maxAdvances: stateCount - 1,
      stateCount,
    });
    start += stateCount;
  }
  return chunks;
}

export function createGen4WildSearcherChunks(
  request: Gen4WildSearcherRequest,
  chunkSize = GEN4_WILD_SEARCHER_CHUNK_SIZE,
) {
  const chunks: Gen4WildSearcherChunk[] = [];
  const total = gen4WildSearcherCombinationCount(request);
  for (let start = 0, index = 0; start < total; index++) {
    const stateCount = Math.min(chunkSize, total - start);
    chunks.push({ index, startIndex: start, stateCount });
    start += stateCount;
  }
  return chunks;
}

export function decodeGen4WildStates(buffer: ArrayBuffer): Gen4WildState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 22 !== 0)
    throw new RangeError("Invalid Gen4 wild result buffer length.");
  return Array.from({ length: words.length / 22 }, (_, row) => {
    const offset = row * 22;
    return {
      advances: words[offset],
      battleAdvances: words[offset + 1],
      pid: words[offset + 2],
      ivs: [
        words[offset + 3],
        words[offset + 4],
        words[offset + 5],
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
      ],
      ability: words[offset + 9],
      gender: words[offset + 10],
      level: words[offset + 11],
      nature: words[offset + 12],
      shiny: words[offset + 13],
      encounterSlot: words[offset + 14],
      species: words[offset + 15],
      form: words[offset + 16],
      item: words[offset + 17],
      hiddenPower: words[offset + 18],
      hiddenPowerStrength: words[offset + 19],
      call: words[offset + 20],
      chatot: words[offset + 21],
    };
  });
}

export function decodeGen4WildSearcherStates(
  buffer: ArrayBuffer,
): Gen4WildSearcherState[] {
  const words = new Uint32Array(buffer);
  if (words.length % 22 !== 0)
    throw new RangeError("Invalid Gen4 wild search result buffer length.");
  return Array.from({ length: words.length / 22 }, (_, row) => {
    const offset = row * 22;
    return {
      seed: words[offset],
      delay: words[offset + 1],
      hour: words[offset + 2],
      advances: words[offset + 3],
      pid: words[offset + 4],
      ivs: [
        words[offset + 5],
        words[offset + 6],
        words[offset + 7],
        words[offset + 8],
        words[offset + 9],
        words[offset + 10],
      ],
      ability: words[offset + 11],
      gender: words[offset + 12],
      level: words[offset + 13],
      nature: words[offset + 14],
      shiny: words[offset + 15],
      encounterSlot: words[offset + 16],
      species: words[offset + 17],
      form: words[offset + 18],
      item: words[offset + 19],
      hiddenPower: words[offset + 20],
      hiddenPowerStrength: words[offset + 21],
      battleAdvances: 0,
      call: 0,
      chatot: 0,
    };
  });
}
