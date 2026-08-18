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
  const size = 0x50;
  const baseOffset = species * size;
  if (baseOffset + size > personal.length) {
    throw new Error(`Missing ORAS personal record for species ${species}.`);
  }
  const formIndex = personal.readUInt16LE(baseOffset + 0x1c);
  const formCount = personal[baseOffset + 0x20];
  const index =
    form > 0 && formIndex > 0 && form <= formCount
      ? formIndex + form - 1
      : species;
  const offset = index * size;
  if (offset + size > personal.length) {
    throw new Error(`Missing ORAS personal form record ${species}:${form}.`);
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
  Gen6: ["x", "y", "omega-ruby", "alpha-sapphire", "transporter"],
  XY: ["x", "y"],
  X: ["x"],
  Y: ["y"],
  ORAS: ["omega-ruby", "alpha-sapphire"],
  OR: ["omega-ruby"],
  AS: ["alpha-sapphire"],
};

const familyVersions = {
  xy: new Set(["x", "y"]),
  oras: new Set(["omega-ruby", "alpha-sapphire"]),
  vc: new Set(["transporter"]),
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
  const bank = boolean("Bank");
  const conceptual = boolean("Conceptual");
  const rawVersion =
    properties.get("Version")?.replace("GameVersion.", "") ?? "Gen6";
  const mappedVersions = versionMap[rawVersion];
  if (!mappedVersions)
    throw new Error(`Unsupported game version: ${rawVersion}`);
  const versions = mappedVersions.filter((item) =>
    familyVersions[context.family].has(item),
  );
  if (versions.length === 0) {
    throw new Error(
      `Template ${context.key}:${index} has no version in ${context.family}.`,
    );
  }
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
  const fixedThreeIv =
    info.eggGroup === 0x0f &&
    (mappedVersions.some((item) => item === "x" || item === "y") ||
      !babySpecies.has(species)) &&
    !egg;
  const otTsv = properties.has("OTTSV") ? number("OTTSV", 0) : null;
  const numOfPokemon = number("NumOfPkm", 1);
  const rawAbility = number("Ability", 0);

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
    ability: rawAbility > 3 ? 3 : rawAbility,
    nature,
    ivs,
    delay: number("Delay", 0),
    conceptual,
    gift,
    egg,
    unstable: boolean("Unstable"),
    syncable: !bank && (!gift || fixedThreeIv),
    shinyLocked: bank || boolean("ShinyLocked") || otTsv !== null,
    perfectIvCount:
      bank && numOfPokemon === 20 && (species === 151 || species === 251)
        ? 5
        : fixedThreeIv
          ? 3
          : 0,
    alwaysSync: gift || nature < 25 || bank,
    instantSync: boolean("InstantSync"),
    bank,
    numOfPokemon,
    otTsv,
  };
}

function defaultTemplate(family, versions) {
  return {
    id: `${family}-default-000`,
    family,
    category: "-",
    versions,
    species: 0,
    form: 0,
    level: 50,
    baseStats: [0, 0, 0, 0, 0, 0],
    genderRatio: 0x7f,
    genderSetting: 0x7e,
    randomGender: true,
    ability: 0,
    nature: 0xff,
    ivs: [-1, -1, -1, -1, -1, -1],
    delay: 0,
    conceptual: true,
    gift: false,
    egg: false,
    unstable: false,
    syncable: true,
    shinyLocked: false,
    perfectIvCount: 0,
    alwaysSync: false,
    instantSync: false,
    bank: false,
    numOfPokemon: 1,
    otTsv: null,
  };
}

const pkm6Path = option("--pkm6");
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
  pkm6,
  personal,
  speciesEn,
  speciesJa,
  speciesZh,
  natureEn,
  natureJa,
  natureZh,
] = await Promise.all([
  readFile(pkm6Path, "utf8"),
  readFile(personalPath),
  readFile(textPaths.species.en, "utf8"),
  readFile(textPaths.species.ja, "utf8"),
  readFile(textPaths.species.zh, "utf8"),
  readFile(textPaths.natures.en, "utf8"),
  readFile(textPaths.natures.ja, "utf8"),
  readFile(textPaths.natures.zh, "utf8"),
]);

const templates = [
  defaultTemplate("xy", ["x", "y"]),
  defaultTemplate("oras", ["omega-ruby", "alpha-sapphire"]),
];
let family;
let category = "-";
let categoryIndex = 0;
for (const line of pkm6.replace(/\r/g, "").split("\n")) {
  if (line.includes("Species_ORAS")) family = "oras";
  else if (line.includes("Species_XY")) family = "xy";
  else if (line.includes("Species_VC")) family = "vc";
  if (!family) continue;
  const categoryMatch = line.match(/Text\s*=\s*"([^"]+)"/);
  if (categoryMatch) {
    category = categoryMatch[1];
    categoryIndex = 0;
    continue;
  }
  const templateMatch = line.match(/new PKM6\s*\{(.+)\}\s*,?/);
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

const source = `/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled species and personal data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen6_stationary_data.mjs.
 */

export type Gen6StationaryVersion =
  | "x"
  | "y"
  | "omega-ruby"
  | "alpha-sapphire"
  | "transporter";
export type Gen6StationaryLanguage = "en" | "ja" | "zh";
export type Gen6StationaryIvTuple = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface Gen6StationaryTemplate {
  readonly id: string;
  readonly family: "xy" | "oras" | "vc";
  readonly category: string;
  readonly versions: readonly Gen6StationaryVersion[];
  readonly species: number;
  readonly form: number;
  readonly level: number;
  readonly baseStats: Gen6StationaryIvTuple;
  readonly genderRatio: number;
  readonly genderSetting: number;
  readonly randomGender: boolean;
  readonly ability: number;
  readonly nature: number;
  readonly ivs: Gen6StationaryIvTuple;
  readonly delay: number;
  readonly conceptual: boolean;
  readonly gift: boolean;
  readonly egg: boolean;
  readonly unstable: boolean;
  readonly syncable: boolean;
  readonly shinyLocked: boolean;
  readonly perfectIvCount: number;
  readonly alwaysSync: boolean;
  readonly instantSync: boolean;
  readonly bank: boolean;
  readonly numOfPokemon: number;
  readonly otTsv: number | null;
}

export const GEN6_STATIONARY_SPECIES = ${JSON.stringify(
  {
    en: readLines(speciesEn),
    ja: readLines(speciesJa),
    zh: readLines(speciesZh),
  },
  null,
  2,
)} as const;

export const GEN6_STATIONARY_NATURES = ${JSON.stringify(
  { en: readLines(natureEn), ja: readLines(natureJa), zh: readLines(natureZh) },
  null,
  2,
)} as const;

export const GEN6_STATIONARY_TEMPLATES = ${JSON.stringify(templates, null, 2)} as const satisfies readonly Gen6StationaryTemplate[];

function supportsVersion(
  template: Gen6StationaryTemplate,
  version: Gen6StationaryVersion,
) {
  return template.versions.includes(version);
}

export function gen6StationaryVersion(
  version: string | undefined,
): Gen6StationaryVersion {
  return version &&
    GEN6_STATIONARY_TEMPLATES.some((template) =>
      supportsVersion(template, version as Gen6StationaryVersion),
    )
    ? (version as Gen6StationaryVersion)
    : "omega-ruby";
}

export function gen6StationaryCategoriesForVersion(
  version: Gen6StationaryVersion,
) {
  return Array.from(
    new Set(
      GEN6_STATIONARY_TEMPLATES.filter((template) =>
        supportsVersion(template, version),
      ).map((template) => template.category),
    ),
  );
}

export function gen6StationaryTemplatesForVersion(
  version: Gen6StationaryVersion,
  category: string,
) {
  return GEN6_STATIONARY_TEMPLATES.filter(
    (template) =>
      template.category === category && supportsVersion(template, version),
  );
}

export function gen6StationaryTemplateName(
  template: Gen6StationaryTemplate,
  language: Gen6StationaryLanguage,
) {
  if (template.conceptual) return "-";
  const species =
    GEN6_STATIONARY_SPECIES[language][template.species] ??
    "#" + template.species;
  if (template.bank && template.species === 154) return "Johto Starters";
  if (template.bank && template.species === 377) return "Legendary Titans";
  if (template.egg) {
    const egg = GEN6_STATIONARY_SPECIES[language][0] ?? "Egg";
    return species + " (" + egg + ")";
  }
  if (template.unstable) return species + " (?)";
  return template.form === 0 ? species : species + "-" + template.form;
}
`;

await writeFile(outputPath, source, "utf8");
