import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`Missing required option: ${name}`);
  }
  return path.resolve(process.argv[index + 1]);
}

function balancedBlock(text, marker, open = "{", close = "}") {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing source marker: ${marker}`);
  const start = text.indexOf(open, markerIndex);
  if (start < 0) throw new Error(`Missing opening ${open} after ${marker}.`);
  let depth = 0;
  let quoted = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (char === '"' && text[index - 1] !== "\\") quoted = !quoted;
    if (quoted) continue;
    if (char === open) depth++;
    if (char === close && --depth === 0) {
      return text.slice(start + 1, index);
    }
  }
  throw new Error(`Unterminated source block after ${marker}.`);
}

function objectBodies(text, classNames) {
  const names = new Set(classNames);
  const pattern = /new\s+([A-Za-z0-9_]+)\s*(?:\(\s*\))?\s*\{/g;
  const objects = [];
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (!names.has(match[1])) continue;
    const start = text.indexOf("{", match.index);
    let depth = 0;
    let quoted = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];
      if (char === '"' && text[index - 1] !== "\\") quoted = !quoted;
      if (quoted) continue;
      if (char === "{") depth++;
      if (char === "}" && --depth === 0) {
        objects.push({
          className: match[1],
          body: text.slice(start + 1, index),
        });
        pattern.lastIndex = index + 1;
        break;
      }
    }
  }
  return objects;
}

function numberProperty(body, name, fallback = 0) {
  const match = body.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`));
  return match ? Number.parseInt(match[1], 10) : fallback;
}

function booleanProperty(body, name, fallback = false) {
  const match = body.match(new RegExp(`\\b${name}\\s*=\\s*(true|false)`));
  return match ? match[1] === "true" : fallback;
}

function stringProperty(body, name) {
  return body.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))?.[1] ?? "";
}

function numberArrayProperty(body, name) {
  const match = body.match(
    new RegExp(
      `\\b${name}\\s*=\\s*new(?:\\s+[A-Za-z0-9_]+)?\\s*\\[\\s*\\]\\s*\\{([^}]*)\\}`,
    ),
  );
  if (!match) return [];
  return [...match[1].matchAll(/-?\d+/g)].map((entry) =>
    Number.parseInt(entry[0], 10),
  );
}

function textLines(value) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .split("\n");
}

function personalEntry(personal, specForm) {
  const species = specForm & 0x7ff;
  const form = specForm >>> 11;
  const size = 0x54;
  const baseOffset = species * size;
  if (baseOffset + size > personal.length) {
    throw new Error(`Missing USUM personal record for species ${species}.`);
  }
  const formIndex = personal.readUInt16LE(baseOffset + 0x1c);
  const formCount = personal[baseOffset + 0x20];
  const index =
    form > 0 && formIndex > 0 && form <= formCount
      ? formIndex + form - 1
      : species;
  const offset = index * size;
  if (offset + size > personal.length) {
    throw new Error(`Missing USUM personal form record ${species}:${form}.`);
  }
  const genderRatio = personal[offset + 0x12];
  return {
    species,
    form,
    gender:
      genderRatio > 0x0f && genderRatio < 0xef
        ? genderRatio - 1
        : genderRatio === 0
          ? 1
          : genderRatio === 0xfe
            ? 2
            : 0,
    randomGender: genderRatio > 0x0f && genderRatio < 0xef,
    fixedThreeIv: personal[offset + 0x16] === 0x0f && !babySpecies.has(species),
    electric: personal[offset + 0x06] === 12 || personal[offset + 0x07] === 12,
    steel: personal[offset + 0x06] === 8 || personal[offset + 0x07] === 8,
  };
}

const babySpecies = new Set([
  30, 31, 172, 173, 174, 175, 201, 236, 238, 239, 240, 298, 360, 406, 433, 438,
  439, 440, 446, 447, 458,
]);
const alolanForms = new Set([
  19, 20, 26, 27, 28, 37, 38, 50, 51, 52, 53, 74, 75, 76, 88, 89, 103, 105,
]);
const dayNightSm = new Map([
  [734, 19],
  [735, 20],
  [165, 167],
  [166, 168],
  [46, 755],
  [47, 756],
  [751, 283],
  [752, 284],
  [425, 200],
  [745, 2793],
  [174, 731],
  [173, 22],
]);
const dayNightUsum = new Map([
  [734, 19],
  [735, 20],
  [165, 167],
  [166, 168],
  [46, 755],
  [47, 756],
  [751, 283],
  [752, 284],
  [425, 198],
  [745, 2793],
  [296, 96],
  [96, 296],
  [297, 97],
  [97, 297],
  [447, 427],
  [200, 743],
]);
const sunMoonSm = new Map([
  [546, 548],
  [766, 765],
  [776, 324],
  [37, 27],
  [780, 359],
]);
const sunMoonUsum = new Map([
  [546, 548],
  [766, 765],
  [776, 324],
  [37, 27],
  [229, 310],
  [780, 359],
]);
const miscNight = new Map([
  [734, 19],
  [735, 20],
]);
const miscUltraNight = new Map([
  [296, 96],
  [96, 296],
]);
const miscMoon = new Map([
  [546, 548],
  [766, 765],
  [627, 629],
  [628, 630],
  [693, 691],
]);

function applyAlolan(specForm) {
  return alolanForms.has(specForm) ? specForm + 2048 : specForm;
}

function normalVariant(area, family, isMoon, isNight) {
  const reverse = area.reverse;
  const night = isNight !== reverse;
  const moon = isMoon !== reverse;
  const dayNight = family === "sm" ? dayNightSm : dayNightUsum;
  const sunMoon = family === "sm" ? sunMoonSm : sunMoonUsum;
  const species = [...area.species];
  for (let index = 1; index < species.length; index++) {
    if (night) species[index] = dayNight.get(species[index]) ?? species[index];
    if (moon) species[index] = sunMoon.get(species[index]) ?? species[index];
    if (family === "usum" && night) {
      if (species[index] === 173) {
        species[index] = index === 6 ? 774 : index === 4 ? 605 : 22;
      }
      if (species[index] === 174) species[index] = index === 7 ? 731 : 506;
      if (area.location === 90 && species[0] === 44 && index === 2) {
        species[index] = 163;
      }
    }
    species[index] = applyAlolan(species[index]);
  }
  return species;
}

function miscVariant(area, family, isMoon, isNight) {
  return area.species.map((value) => {
    let species = value;
    if (isNight) species = miscNight.get(species) ?? species;
    if (isNight && family === "usum") {
      species = miscUltraNight.get(species) ?? species;
    }
    if (isMoon) species = miscMoon.get(species) ?? species;
    return applyAlolan(species);
  });
}

function slotMetadata(species, personal) {
  return species.map((specForm) => personalEntry(personal, specForm));
}

function parseArea(body, kind) {
  const levelMin = numberProperty(
    body,
    "LevelMin",
    kind === "fishing" ? 10 : 0,
  );
  const explicitLevelMax = numberProperty(body, "LevelMax", 0);
  return {
    location: numberProperty(body, "Location"),
    index: numberProperty(body, "idx"),
    mark: stringProperty(body, "mark"),
    npc: numberProperty(body, "NPC"),
    correction: numberProperty(body, "Correction", 1),
    levelMin,
    levelMax: explicitLevelMax || levelMin + 3,
    levelDifference: numberProperty(body, "lvldiff"),
    reverse: booleanProperty(body, "Reverse"),
    raining: booleanProperty(body, "Raining"),
    species: numberArrayProperty(body, "Species"),
    slotType: numberProperty(body, "SlotType"),
    longDelay: booleanProperty(body, "Longdelay"),
    lapras: booleanProperty(body, "Lapras"),
    delayType1: numberProperty(body, "DelayType1", 1),
    delayType2: numberProperty(body, "DelayType2", 1),
    delay1: numberProperty(body, "Delay1", 4),
    delay2: numberProperty(body, "Delay2", 90),
  };
}

function parseSlotTypes(encounterSource) {
  const block = balancedBlock(encounterSource, "SlotType = new byte[][]");
  return [...block.matchAll(/new\s+byte\s*\[\s*\]\s*\{([^}]*)\}/g)].map(
    (match) => [...match[1].matchAll(/\d+/g)].map((entry) => Number(entry[0])),
  );
}

function buildNormalAreas(source, marker, family, slotTypes, personal) {
  const block = balancedBlock(source, marker);
  return objectBodies(block, [
    family === "sm" ? "EncounterArea_SM" : "EncounterArea_USUM",
  ])
    .map(({ body }) => parseArea(body, "normal"))
    .filter((area) => area.location > 0 && area.species.length > 1)
    .map((area, inventoryIndex) => {
      const distribution = area.location + (area.index << 8) === 1190 ? 1 : 0;
      const variant = (isMoon, isNight) => {
        const raw = normalVariant(area, family, isMoon, isNight);
        const slotMap = slotTypes[raw[0]];
        if (!slotMap) throw new Error(`Missing slot map ${raw[0]}.`);
        return slotMetadata(
          slotMap.map((slot) => raw[slot]),
          personal,
        );
      };
      return {
        id: `${family}-normal-${String(inventoryIndex).padStart(3, "0")}`,
        family,
        category: "normal",
        location: area.location,
        locationIndex: area.location + (area.index << 8),
        index: area.index,
        mark: area.mark,
        npc: area.npc,
        correction: area.correction,
        raining: area.raining,
        levelMin: area.levelMin,
        levelMax: area.levelMax,
        levelMinMoon: area.levelMin + area.levelDifference,
        levelMaxMoon: area.levelMax + area.levelDifference,
        slotType: distribution,
        variants: {
          sunDay: variant(false, false),
          sunNight: variant(false, true),
          moonDay: variant(true, false),
          moonNight: variant(true, true),
        },
      };
    });
}

function buildSimpleAreas(source, marker, family, kind, personal) {
  const className = kind === "fishing" ? "FishingArea7" : "MiscEncounter7";
  const block = balancedBlock(source, marker);
  return objectBodies(block, [className]).map(({ body }, inventoryIndex) => {
    const area = parseArea(body, kind);
    const variant = (isMoon, isNight) =>
      slotMetadata(
        kind === "misc"
          ? miscVariant(area, family, isMoon, isNight)
          : area.species.map(applyAlolan),
        personal,
      );
    return {
      id: `${family}-${kind}-${String(inventoryIndex).padStart(3, "0")}`,
      family,
      category: kind,
      location: area.location,
      locationIndex: area.location + (area.index << 8),
      index: area.index,
      mark: area.mark,
      npc: area.npc,
      correction: area.correction,
      raining: area.raining,
      levelMin: area.levelMin,
      levelMax: area.levelMax,
      levelMinMoon: area.levelMin,
      levelMaxMoon: area.levelMax,
      slotType: area.slotType,
      longDelay: area.longDelay,
      lapras: area.lapras,
      delayType1: area.delayType1,
      delayType2: area.delayType2,
      delay1: area.delay1,
      delay2: area.delay2,
      cry: area.location === 64,
      variants: {
        sunDay: variant(false, false),
        sunNight: variant(false, true),
        moonDay: variant(true, false),
        moonNight: variant(true, true),
      },
    };
  });
}

function buildSpecials(source, family, personal) {
  const familyBlock = balancedBlock(
    source,
    family === "sm" ? "Species_SM" : "Species_USUM",
  );
  const categoryBlocks = [];
  const categoryPattern = /Text\s*=\s*"([^"]+)"/g;
  const matches = [...familyBlock.matchAll(categoryPattern)];
  for (let index = 0; index < matches.length; index++) {
    const start = matches[index].index;
    const end = matches[index + 1]?.index ?? familyBlock.length;
    categoryBlocks.push({
      name: matches[index][1],
      body: familyBlock.slice(start, end),
    });
  }
  const versionMap = {
    sm: { default: ["sun", "moon"], SN: ["sun"], MN: ["moon"] },
    usum: {
      default: ["ultra-sun", "ultra-moon"],
      US: ["ultra-sun"],
      UM: ["ultra-moon"],
    },
  };
  return categoryBlocks
    .filter(({ name }) => name === "UB" || name === "Island Scan")
    .flatMap(({ name, body }) =>
      objectBodies(body, ["PKMW7"])
        .map(({ body: objectBody }, inventoryIndex) => {
          const species = numberProperty(objectBody, "Species");
          const locations = numberArrayProperty(objectBody, "Location");
          const rates = numberArrayProperty(objectBody, "Rate");
          const version = objectBody.match(
            /Version\s*=\s*GameVersion\.([A-Z]+)/,
          )?.[1];
          const form = numberProperty(objectBody, "Forme");
          const metadata = personalEntry(personal, species | (form << 11));
          return {
            id: `${family}-${name === "UB" ? "ub" : "island-scan"}-${String(inventoryIndex).padStart(3, "0")}`,
            family,
            category: name === "UB" ? "ub" : "island-scan",
            versions: versionMap[family][version ?? "default"],
            species,
            form,
            level: numberProperty(objectBody, "Level"),
            conceptual: booleanProperty(objectBody, "Conceptual"),
            locations,
            rates: locations.map(
              (_, index) => rates[index] ?? (name === "UB" ? 80 : 50),
            ),
            gender: metadata.gender,
            randomGender: metadata.randomGender,
            fixedThreeIv: metadata.fixedThreeIv,
          };
        })
        .filter((entry) => entry.species > 0 && entry.locations.length > 0),
    );
}

function buildBerryAreas(normalAreas, personal) {
  const spots = new Set([12, 10, 50, 52, 58, 106, 110, 118, 120, 158, 166]);
  const species = slotMetadata([739], personal);
  return normalAreas
    .filter((area) => spots.has(area.location))
    .filter(
      (area, index, entries) =>
        entries.findIndex((entry) => entry.location === area.location) ===
        index,
    )
    .map((area, index) => ({
      id: `${area.family}-berry-${String(index).padStart(3, "0")}`,
      family: area.family,
      category: "berry",
      location: area.location,
      locationIndex: area.location,
      index: 0,
      mark: "",
      npc: area.npc || 7,
      correction: 1,
      raining: area.raining,
      levelMin: area.levelMax,
      levelMax: area.levelMax,
      levelMinMoon: area.levelMaxMoon,
      levelMaxMoon: area.levelMaxMoon,
      slotType: 42,
      variants: {
        sunDay: species,
        sunNight: species,
        moonDay: species,
        moonNight: species,
      },
    }));
}

const locationTablePath = option("--location-table");
const encounterAreaPath = option("--encounter-area");
const pkmw7Path = option("--pkmw7");
const personalPath = option("--personal");
const outputPath = option("--output");
const sourcePaths = {
  species: {
    en: option("--species-en"),
    ja: option("--species-ja"),
    zh: option("--species-zh"),
  },
  natures: {
    en: option("--natures-en"),
    ja: option("--natures-ja"),
    zh: option("--natures-zh"),
  },
  locations: {
    en: option("--locations-en"),
    ja: option("--locations-ja"),
    zh: option("--locations-zh"),
  },
};

const [
  locationSource,
  encounterSource,
  pkmw7Source,
  personal,
  speciesEn,
  speciesJa,
  speciesZh,
  natureEn,
  natureJa,
  natureZh,
  locationEn,
  locationJa,
  locationZh,
] = await Promise.all([
  readFile(locationTablePath, "utf8"),
  readFile(encounterAreaPath, "utf8"),
  readFile(pkmw7Path, "utf8"),
  readFile(personalPath),
  readFile(sourcePaths.species.en, "utf8"),
  readFile(sourcePaths.species.ja, "utf8"),
  readFile(sourcePaths.species.zh, "utf8"),
  readFile(sourcePaths.natures.en, "utf8"),
  readFile(sourcePaths.natures.ja, "utf8"),
  readFile(sourcePaths.natures.zh, "utf8"),
  readFile(sourcePaths.locations.en, "utf8"),
  readFile(sourcePaths.locations.ja, "utf8"),
  readFile(sourcePaths.locations.zh, "utf8"),
]);

const slotTypes = parseSlotTypes(encounterSource);
const normalSm = buildNormalAreas(
  locationSource,
  "EncounterArea7[] SMTable =",
  "sm",
  slotTypes,
  personal,
);
const normalUsum = buildNormalAreas(
  locationSource,
  "EncounterArea7[] USUMTable =",
  "usum",
  slotTypes,
  personal,
);
const fishingSm = buildSimpleAreas(
  locationSource,
  "FishingArea7[] Fishing_SM =",
  "sm",
  "fishing",
  personal,
);
const fishingUsum = buildSimpleAreas(
  locationSource,
  "FishingArea7[] Fishing_USUM =",
  "usum",
  "fishing",
  personal,
);
const miscSm = buildSimpleAreas(
  locationSource,
  "MiscEncounter7[] Misc_SM =",
  "sm",
  "misc",
  personal,
);
const miscUsum = buildSimpleAreas(
  locationSource,
  "MiscEncounter7[] Misc_USUM =",
  "usum",
  "misc",
  personal,
);
const areas = [
  ...normalSm,
  ...normalUsum,
  ...fishingSm,
  ...fishingUsum,
  ...miscSm,
  ...miscUsum,
  ...buildBerryAreas(normalSm, personal),
  ...buildBerryAreas(normalUsum, personal),
];
const specials = [
  ...buildSpecials(pkmw7Source, "sm", personal),
  ...buildSpecials(pkmw7Source, "usum", personal),
];

const source = `/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled species, location and personal data
 * retain their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen7_wild_data.mjs.
 */

export type Gen7WildGameVersion = "sun" | "moon" | "ultra-sun" | "ultra-moon";
export type Gen7WildFamily = "sm" | "usum";
export type Gen7WildCategory = "normal" | "ub" | "island-scan" | "fishing" | "misc" | "berry";

export interface Gen7WildSlot {
  readonly species: number;
  readonly form: number;
  readonly gender: number;
  readonly randomGender: boolean;
  readonly fixedThreeIv: boolean;
  readonly electric: boolean;
  readonly steel: boolean;
}

export interface Gen7WildArea {
  readonly id: string;
  readonly family: Gen7WildFamily;
  readonly category: Exclude<Gen7WildCategory, "ub" | "island-scan">;
  readonly location: number;
  readonly locationIndex: number;
  readonly index: number;
  readonly mark: string;
  readonly npc: number;
  readonly correction: number;
  readonly raining: boolean;
  readonly levelMin: number;
  readonly levelMax: number;
  readonly levelMinMoon: number;
  readonly levelMaxMoon: number;
  readonly slotType: number;
  readonly longDelay?: boolean;
  readonly lapras?: boolean;
  readonly delayType1?: number;
  readonly delayType2?: number;
  readonly delay1?: number;
  readonly delay2?: number;
  readonly cry?: boolean;
  readonly variants: {
    readonly sunDay: readonly Gen7WildSlot[];
    readonly sunNight: readonly Gen7WildSlot[];
    readonly moonDay: readonly Gen7WildSlot[];
    readonly moonNight: readonly Gen7WildSlot[];
  };
}

export interface Gen7WildSpecialEncounter {
  readonly id: string;
  readonly family: Gen7WildFamily;
  readonly category: "ub" | "island-scan";
  readonly versions: readonly Gen7WildGameVersion[];
  readonly species: number;
  readonly form: number;
  readonly level: number;
  readonly conceptual: boolean;
  readonly locations: readonly number[];
  readonly rates: readonly number[];
  readonly gender: number;
  readonly randomGender: boolean;
  readonly fixedThreeIv: boolean;
}

export const GEN7_WILD_SPECIES = ${JSON.stringify(
  {
    en: textLines(speciesEn),
    ja: textLines(speciesJa),
    zh: textLines(speciesZh),
  },
  null,
  2,
)} as const;

export const GEN7_WILD_NATURES = ${JSON.stringify(
  { en: textLines(natureEn), ja: textLines(natureJa), zh: textLines(natureZh) },
  null,
  2,
)} as const;

export const GEN7_WILD_LOCATIONS = ${JSON.stringify(
  {
    en: textLines(locationEn),
    ja: textLines(locationJa),
    zh: textLines(locationZh),
  },
  null,
  2,
)} as const;

export const GEN7_WILD_SLOT_DISTRIBUTIONS = ${JSON.stringify(slotTypes, null, 2)} as const;

export const GEN7_WILD_AREAS = ${JSON.stringify(areas, null, 2)} as const satisfies readonly Gen7WildArea[];

export const GEN7_WILD_SPECIALS = ${JSON.stringify(specials, null, 2)} as const satisfies readonly Gen7WildSpecialEncounter[];
`;

await writeFile(outputPath, source, "utf8");
