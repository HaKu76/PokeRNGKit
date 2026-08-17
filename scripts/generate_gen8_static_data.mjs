import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const pokeFinderRoot =
  process.env.POKEFINDER_ROOT ??
  "C:\\Users\\Hakuhiro\\Desktop\\project\\PokeFinder-master";
const encounterRoot =
  process.env.ENCOUNTER_TABLE_ROOT ??
  "C:\\Users\\Hakuhiro\\AppData\\Local\\Temp\\EncounterTableGenerator-7769c1df-20260817\\EncounterTableGenerator-7769c1df80be93761fe6479d51cbf2fe7a7dc4f9\\Gen8";

const encounterPath = path.join(encounterRoot, "encounters.json");
const personalPath = path.join(
  pokeFinderRoot,
  "Core",
  "Resources",
  "Personal",
  "Gen8",
  "personal_bdsp.bin",
);
const encounters = JSON.parse(await readFile(encounterPath, "utf8"));
const personal = await readFile(personalPath);

const recordSize = 0x44;
const speciesCount = 494;
if (
  personal.length % recordSize !== 0 ||
  personal.length < speciesCount * recordSize
) {
  throw new Error(`Unexpected BDSP personal data length: ${personal.length}`);
}

function personalInfo(species) {
  const offset = species * recordSize;
  return {
    genderRatio: personal[offset + 0x12],
    abilityIds: Array.from({ length: 3 }, (_, index) =>
      personal.readUInt16LE(offset + 0x18 + index * 2),
    ),
  };
}

function versions(value) {
  if (value === "Game::BD") return ["brilliantdiamond"];
  if (value === "Game::SP") return ["shiningpearl"];
  if (value === "Game::BDSP") return ["brilliantdiamond", "shiningpearl"];
  throw new Error(`Unsupported Gen 8 Static version: ${value}`);
}

const categories = Object.entries(encounters).map(([id, entries]) => ({
  id,
  sourceLabel: {
    starters: "Starters",
    gifts: "Gifts",
    fossils: "Fossils",
    stationary: "Stationary",
    roamers: "Roamers",
    legends: "Legends",
    ramanasParkPureSpace: "Ramanas Park (Pure Space)",
    ramanasParkStrangeSpace: "Ramanas Park (Strange Space)",
    mythics: "Mythics",
  }[id],
  templates: entries.map((entry, index) => ({
    index,
    description: entry.description,
    versions: versions(entry.version),
    species: entry.specie,
    form: entry.form ?? 0,
    shiny: entry.shiny === "Shiny::Never" ? 1 : 0,
    ability: entry.ability ?? 255,
    gender: entry.gender ?? 255,
    ivCount: entry.ivCount ?? 0,
    level: entry.level,
    fateful: Boolean(entry.fateful),
    roamer: Boolean(entry.roamer),
    ...personalInfo(entry.specie),
  })),
}));
if (categories.some((category) => category.sourceLabel === undefined)) {
  throw new Error("Gen 8 Static category list changed.");
}
const templateCount = categories.reduce(
  (sum, category) => sum + category.templates.length,
  0,
);
if (categories.length !== 9 || templateCount !== 47) {
  throw new Error(
    `Expected 9 Gen 8 Static categories and 47 templates, received ${categories.length} and ${templateCount}.`,
  );
}

const typeScript = `/*!
 * Generated from EncounterTableGenerator Gen8/encounters.json and
 * PokeFinder 4.3.2 personal_bdsp.bin.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen8_static_data.mjs.
 */

export type Gen8StaticVersion = "brilliantdiamond" | "shiningpearl";

export interface Gen8StaticTemplate {
  index: number;
  description: string;
  versions: readonly Gen8StaticVersion[];
  species: number;
  form: number;
  shiny: 0 | 1;
  ability: number;
  gender: number;
  ivCount: number;
  level: number;
  fateful: boolean;
  roamer: boolean;
  genderRatio: number;
  abilityIds: readonly [number, number, number];
}

export interface Gen8StaticCategory {
  id: string;
  sourceLabel: string;
  templates: readonly Gen8StaticTemplate[];
}

export const GEN8_STATIC_CATEGORIES = ${JSON.stringify(categories, null, 2)} as const satisfies readonly Gen8StaticCategory[];

export const GEN8_STATIC_TEMPLATE_COUNT = ${templateCount};
`;
await writeFile(
  path.join(projectRoot, "src", "features", "gen8static", "data.ts"),
  typeScript,
  "utf8",
);

const compact = Buffer.alloc(speciesCount * 13);
for (let species = 0; species < speciesCount; species += 1) {
  const sourceOffset = species * recordSize;
  const targetOffset = species * 13;
  [0, 1, 2, 4, 5, 3].forEach((offset, index) => {
    compact[targetOffset + index] = personal[sourceOffset + offset];
  });
  compact[targetOffset + 6] = personal[sourceOffset + 0x12];
  for (let ability = 0; ability < 3; ability += 1) {
    compact.writeUInt16LE(
      personal.readUInt16LE(sourceOffset + 0x18 + ability * 2),
      targetOffset + 7 + ability * 2,
    );
  }
}

const encoded = compact.toString("base64");
const lines = encoded.match(/.{1,100}/g) ?? [];
const include = [
  "// Generated from PokeFinder 4.3.2 personal_bdsp.bin.",
  "// Records 0..493: six base stats, gender ratio, three uint16 ability IDs.",
  "constexpr std::string_view gen8StaticPersonalBase64 =",
  ...lines.map((line, index) =>
    index === lines.length - 1 ? `    "${line}";` : `    "${line}"`,
  ),
  "",
].join("\n");
await writeFile(
  path.join(
    projectRoot,
    "wasm",
    "modules",
    "gen8static",
    "bridge",
    "personal_data.inc",
  ),
  include,
  "utf8",
);
