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

function parseNumber(value) {
  const normalized = value.trim();
  if (/^-?0x[\da-f]+$/i.test(normalized)) {
    const sign = normalized.startsWith("-") ? -1 : 1;
    return sign * Number.parseInt(normalized.replace("-", ""), 16);
  }
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error(`Unsupported numeric value: ${value}`);
  }
  return Number.parseInt(normalized, 10);
}

function readLines(text) {
  return text.replace(/\r/g, "").split("\n").filter(Boolean);
}

function personalEntry(personal, species, form) {
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
  return {
    baseStats: [
      personal[offset],
      personal[offset + 1],
      personal[offset + 2],
      personal[offset + 4],
      personal[offset + 5],
      personal[offset + 3],
    ],
    genderRatio: personal[offset + 0x12],
    eggGroup: personal[offset + 0x16],
  };
}

const babySpecies = new Set([
  30, 31, 172, 173, 174, 175, 201, 236, 238, 239, 240, 298, 360, 406, 433, 438,
  439, 440, 446, 447, 458,
]);

const versionMap = {
  Gen7: ["sun", "moon", "ultra-sun", "ultra-moon"],
  SM: ["sun", "moon"],
  SN: ["sun"],
  MN: ["moon"],
  USUM: ["ultra-sun", "ultra-moon"],
  US: ["ultra-sun"],
  UM: ["ultra-moon"],
};

const familyVersions = {
  sm: new Set(["sun", "moon"]),
  usum: new Set(["ultra-sun", "ultra-moon"]),
};

function parseTemplate(body, context, personal, index) {
  const ivMatch = body.match(/IVs\s*=\s*new\[\]\s*\{([^}]*)\}/);
  const ivs = ivMatch
    ? ivMatch[1].split(",").map(parseNumber)
    : [-1, -1, -1, -1, -1, -1];
  if (ivs.length !== 6) {
    throw new Error(`Invalid IV template at ${context.key}:${index}.`);
  }
  const properties = new Map();
  const withoutIvs = ivMatch ? body.replace(ivMatch[0], "") : body;
  for (const segment of withoutIvs.split(",")) {
    const match = segment.match(/^\s*(\w+)\s*=\s*(.+?)\s*$/);
    if (match) properties.set(match[1], match[2]);
  }
  const number = (key, fallback) =>
    properties.has(key) ? parseNumber(properties.get(key)) : fallback;
  const boolean = (key, fallback = false) =>
    properties.has(key) ? properties.get(key) === "true" : fallback;

  const species = number("Species", 0);
  const form = number("Forme", 0);
  const info = personalEntry(personal, species, form);
  const nature = number("Nature", 0xff);
  const gift = boolean("Gift");
  const egg = boolean("Egg");
  const totem = boolean("Totem");
  const ultraWormhole = boolean("UltraWormhole");
  const otTsv = properties.has("OTTSV") ? number("OTTSV", 0) : null;
  const rawGender = number("Gender", 0);
  const genderRatio = rawGender > 0 ? 2 - 2 * rawGender : info.genderRatio;
  const randomGender = genderRatio > 0x0f && genderRatio < 0xef;
  const genderSetting = randomGender
    ? genderRatio - 1
    : genderRatio === 0
      ? 1
      : genderRatio === 0xfe
        ? 2
        : 0;
  let alwaysSync = gift || nature < 25;
  const postNatureLock = species === 132 && nature < 25;
  if (postNatureLock) alwaysSync = false;
  const rawAbility = number("Ability", 0);
  let ability = rawAbility > 3 ? 3 : rawAbility;
  if (ability === 0 && !alwaysSync) ability = 1;
  if (rawAbility === 0xff) ability = 0;
  const shinyLocked = properties.has("ShinyLocked")
    ? boolean("ShinyLocked")
    : totem || ultraWormhole || otTsv !== null;
  const version =
    properties.get("Version")?.replace("GameVersion.", "") ?? "Gen7";
  const mappedVersions = versionMap[version];
  if (!mappedVersions) throw new Error(`Unsupported game version: ${version}`);
  const versions = mappedVersions.filter((item) =>
    familyVersions[context.family].has(item),
  );
  if (versions.length === 0) {
    throw new Error(
      `Template ${context.key}:${index} has no version in ${context.family}.`,
    );
  }

  return {
    id: `${context.key}-${String(index).padStart(3, "0")}`,
    family: context.family,
    category: context.category,
    versions,
    species,
    form,
    level: number("Level", 0),
    baseStats: info.baseStats,
    genderRatio,
    genderSetting,
    randomGender,
    ability,
    nature,
    ivs,
    npc: number("NPC", 0),
    delay: number("Delay", 0),
    delayType: number("DelayType", 0),
    conceptual: boolean("Conceptual"),
    gift,
    egg,
    totem,
    ultraWormhole,
    unstable: boolean("Unstable"),
    syncable: boolean("Syncable", true),
    shinyLocked,
    fixedThreeIv:
      (info.eggGroup === 0x0f && !babySpecies.has(species) && !egg) ||
      totem ||
      ultraWormhole,
    alwaysSync,
    raining: boolean("Raining"),
    pelago: boolean("IsPelago"),
    otTsv,
    trade: otTsv !== null && !gift,
    fateful: otTsv !== null && gift,
    postNatureLock,
  };
}

const pkm7Path = option("--pkm7");
const personalPath = option("--personal");
const outputPath = option("--output");
const textPaths = {
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
};

const [
  pkm7,
  personal,
  speciesEn,
  speciesJa,
  speciesZh,
  natureEn,
  natureJa,
  natureZh,
] = await Promise.all([
  readFile(pkm7Path, "utf8"),
  readFile(personalPath),
  readFile(textPaths.species.en, "utf8"),
  readFile(textPaths.species.ja, "utf8"),
  readFile(textPaths.species.zh, "utf8"),
  readFile(textPaths.natures.en, "utf8"),
  readFile(textPaths.natures.ja, "utf8"),
  readFile(textPaths.natures.zh, "utf8"),
]);

const templates = [];
let family;
let category = "-";
let categoryIndex = 0;
for (const line of pkm7.replace(/\r/g, "").split("\n")) {
  if (line.includes("Species_USUM")) family = "usum";
  else if (line.includes("Species_SM")) family = "sm";
  if (!family) continue;
  const categoryMatch = line.match(/Text\s*=\s*"([^"]+)"/);
  if (categoryMatch) {
    category = categoryMatch[1];
    categoryIndex = 0;
    continue;
  }
  const templateMatch = line.match(/new PKM7\s*\{(.+)\}\s*,?/);
  if (!templateMatch) continue;
  templates.push(
    parseTemplate(
      templateMatch[1],
      {
        family,
        category,
        key: `${family}-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      },
      personal,
      categoryIndex++,
    ),
  );
}

for (const familyName of ["sm", "usum"]) {
  templates.unshift({
    id: `${familyName}-default-000`,
    family: familyName,
    category: "-",
    versions:
      familyName === "sm" ? ["sun", "moon"] : ["ultra-sun", "ultra-moon"],
    species: 0,
    form: 0,
    level: 50,
    baseStats: [0, 0, 0, 0, 0, 0],
    genderRatio: 0xff,
    genderSetting: 0,
    randomGender: false,
    ability: 0,
    nature: 0xff,
    ivs: [-1, -1, -1, -1, -1, -1],
    npc: 0,
    delay: 0,
    delayType: 0,
    conceptual: true,
    gift: false,
    egg: false,
    totem: false,
    ultraWormhole: false,
    unstable: false,
    syncable: true,
    shinyLocked: false,
    fixedThreeIv: false,
    alwaysSync: false,
    raining: false,
    pelago: false,
    otTsv: null,
    trade: false,
    fateful: false,
    postNatureLock: false,
  });
}

const source = `/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled species and personal data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen7_stationary_data.mjs.
 */

export type Gen7StationaryGameVersion =
  | "sun"
  | "moon"
  | "ultra-sun"
  | "ultra-moon";

export interface Gen7StationaryTemplate {
  readonly id: string;
  readonly family: "sm" | "usum";
  readonly category: string;
  readonly versions: readonly Gen7StationaryGameVersion[];
  readonly species: number;
  readonly form: number;
  readonly level: number;
  readonly baseStats: readonly [number, number, number, number, number, number];
  readonly genderRatio: number;
  readonly genderSetting: number;
  readonly randomGender: boolean;
  readonly ability: number;
  readonly nature: number;
  readonly ivs: readonly [number, number, number, number, number, number];
  readonly npc: number;
  readonly delay: number;
  readonly delayType: number;
  readonly conceptual: boolean;
  readonly gift: boolean;
  readonly egg: boolean;
  readonly totem: boolean;
  readonly ultraWormhole: boolean;
  readonly unstable: boolean;
  readonly syncable: boolean;
  readonly shinyLocked: boolean;
  readonly fixedThreeIv: boolean;
  readonly alwaysSync: boolean;
  readonly raining: boolean;
  readonly pelago: boolean;
  readonly otTsv: number | null;
  readonly trade: boolean;
  readonly fateful: boolean;
  readonly postNatureLock: boolean;
}

export const GEN7_STATIONARY_SPECIES = ${JSON.stringify(
  {
    en: readLines(speciesEn),
    ja: readLines(speciesJa),
    zh: readLines(speciesZh),
  },
  null,
  2,
)} as const;

export const GEN7_STATIONARY_NATURES = ${JSON.stringify(
  { en: readLines(natureEn), ja: readLines(natureJa), zh: readLines(natureZh) },
  null,
  2,
)} as const;

export const GEN7_STATIONARY_TEMPLATES = ${JSON.stringify(templates, null, 2)} as const satisfies readonly Gen7StationaryTemplate[];
`;

await writeFile(outputPath, source, "utf8");
