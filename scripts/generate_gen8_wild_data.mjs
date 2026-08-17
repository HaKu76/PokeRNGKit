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

const personalPath = path.join(
  pokeFinderRoot,
  "Core",
  "Resources",
  "Personal",
  "Gen8",
  "personal_bdsp.bin",
);
const bdspRoot = path.join(encounterRoot, "bdsp");
const [diamondSource, pearlSource, mapSource, areaNameSource, modifierSource] =
  await Promise.all([
    readFile(path.join(bdspRoot, "FieldEncountTable_d.json"), "utf8"),
    readFile(path.join(bdspRoot, "FieldEncountTable_p.json"), "utf8"),
    readFile(path.join(bdspRoot, "MapInfo.json"), "utf8"),
    readFile(path.join(bdspRoot, "english_dp_fld_areaname.json"), "utf8"),
    readFile(path.join(encounterRoot, "location_modifier.json"), "utf8"),
  ]);
const personal = await readFile(personalPath);

const diamond = JSON.parse(diamondSource);
const pearl = JSON.parse(pearlSource);
const mapInfo = JSON.parse(mapSource).ZoneData;
const areaNames = JSON.parse(areaNameSource).labelDataArray;
const locationModifiers = JSON.parse(modifierSource).bdsp;
const recordSize = 0x44;
const speciesCount = 494;
const skippedMaps = new Set([
  14, 31, 33, 35, 36, 37, 38, 39, 44, 45, 46, 64, 65, 66, 67, 68, 70, 71, 72,
  73, 74, 76, 77, 78, 79, 80, 126, 127, 128, 129, 130, 131, 132, 133,
]);
const honeyLocations = [
  145, 146, 147, 148, 149, 150, 156, 157, 159, 160, 161, 162, 163, 164, 167,
  169, 170, 7, 8, 9, 201,
];
const greatMarsh = [55, 183, 194, 195, 298, 315, 397, 399, 400, 451, 453, 455];
const greatMarshNationalDex = [
  46, 55, 102, 115, 193, 285, 315, 316, 397, 451, 452, 453, 454, 455,
];
const trophyGarden = [
  35, 39, 52, 113, 133, 137, 173, 174, 183, 298, 311, 312, 351, 438, 439, 440,
];

if (
  personal.length % recordSize !== 0 ||
  personal.length < speciesCount * recordSize
) {
  throw new Error(`Unexpected BDSP personal data length: ${personal.length}`);
}

function slot(entry) {
  return {
    species: entry.monsNo,
    minLevel: entry.minlv,
    maxLevel: entry.maxlv,
  };
}

function areaName(mapNumber, encounter) {
  const zone = mapInfo.find((entry) => entry.ZoneID === encounter.zoneID);
  if (!zone) return undefined;
  const label = areaNames.find(
    (entry) => entry.labelName === zone.PokePlaceName,
  );
  if (!label) return undefined;
  const sourceName = label.wordDataArray[0].str;
  return locationModifiers[sourceName]?.[String(mapNumber)] ?? sourceName;
}

function buildAreas(source) {
  return source.table.flatMap((encounter, location) => {
    if (skippedMaps.has(location)) return [];
    const name = areaName(location, encounter);
    if (!name) return [];
    return [
      {
        location,
        sourceName: name,
        rates: {
          grass: encounter.encRate_gr,
          surfing: encounter.encRate_wat,
          oldRod: encounter.encRate_turi_boro,
          goodRod: encounter.encRate_turi_ii,
          superRod: encounter.encRate_sugoi,
        },
        grass: encounter.ground_mons.map(slot),
        swarm: encounter.tairyo.map((entry) => entry.monsNo),
        day: encounter.day.map((entry) => entry.monsNo),
        night: encounter.night.map((entry) => entry.monsNo),
        radar: encounter.swayGrass.map((entry) => entry.monsNo),
        surfing: encounter.water_mons.map(slot),
        oldRod: encounter.boro_mons.map(slot),
        goodRod: encounter.ii_mons.map(slot),
        superRod: encounter.sugoi_mons.map(slot),
      },
    ];
  });
}

function buildHoney(source) {
  const groups = ["Normal", "Rare", "SuperRare"];
  return honeyLocations.map((location) => ({
    location,
    groups: groups.map((group) =>
      source.mistu.map((entry) => ({
        species: entry[group],
        minLevel: 5,
        maxLevel: 15,
      })),
    ),
  }));
}

const data = {
  brilliantdiamond: {
    areas: buildAreas(diamond),
    honey: buildHoney(diamond),
  },
  shiningpearl: {
    areas: buildAreas(pearl),
    honey: buildHoney(pearl),
  },
};

for (const [version, value] of Object.entries(data)) {
  if (value.areas.length !== 124 || value.honey.length !== 21) {
    throw new Error(
      `Unexpected ${version} Wild data counts: ${value.areas.length} areas and ${value.honey.length} honey areas.`,
    );
  }
}

const typeScript = `/*!
 * Generated from EncounterTableGenerator BDSP encounter tables.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen8_wild_data.mjs.
 */

export type Gen8WildVersion = "brilliantdiamond" | "shiningpearl";
export type Gen8WildEncounter =
  | "grass"
  | "honeyTree"
  | "rockSmash"
  | "surfing"
  | "oldRod"
  | "goodRod"
  | "superRod";

export interface Gen8WildSlot {
  species: number;
  minLevel: number;
  maxLevel: number;
}

export interface Gen8WildArea {
  location: number;
  sourceName: string;
  rates: Readonly<Record<Exclude<Gen8WildEncounter, "honeyTree" | "rockSmash">, number>>;
  grass: readonly Gen8WildSlot[];
  swarm: readonly number[];
  day: readonly number[];
  night: readonly number[];
  radar: readonly number[];
  surfing: readonly Gen8WildSlot[];
  oldRod: readonly Gen8WildSlot[];
  goodRod: readonly Gen8WildSlot[];
  superRod: readonly Gen8WildSlot[];
}

export interface Gen8WildHoneyArea {
  location: number;
  groups: readonly (readonly Gen8WildSlot[])[];
}

export interface Gen8WildVersionData {
  areas: readonly Gen8WildArea[];
  honey: readonly Gen8WildHoneyArea[];
}

export const GEN8_WILD_DATA = ${JSON.stringify(data, null, 2)} as const satisfies Record<Gen8WildVersion, Gen8WildVersionData>;

export const GEN8_WILD_HONEY_LOCATIONS = ${JSON.stringify(honeyLocations)} as const;
export const GEN8_WILD_GREAT_MARSH = ${JSON.stringify(greatMarsh)} as const;
export const GEN8_WILD_GREAT_MARSH_NATIONAL_DEX = ${JSON.stringify(greatMarshNationalDex)} as const;
export const GEN8_WILD_TROPHY_GARDEN = ${JSON.stringify(trophyGarden)} as const;
`;

await writeFile(
  path.join(projectRoot, "src", "features", "gen8wild", "data.ts"),
  typeScript,
  "utf8",
);

const compactPersonal = Buffer.alloc(speciesCount * 21);
for (let species = 0; species < speciesCount; species += 1) {
  const sourceOffset = species * recordSize;
  const targetOffset = species * 21;
  [0, 1, 2, 4, 5, 3].forEach((offset, index) => {
    compactPersonal[targetOffset + index] = personal[sourceOffset + offset];
  });
  compactPersonal[targetOffset + 6] = personal[sourceOffset + 0x06];
  compactPersonal[targetOffset + 7] = personal[sourceOffset + 0x07];
  for (let item = 0; item < 3; item += 1) {
    compactPersonal.writeUInt16LE(
      personal.readUInt16LE(sourceOffset + 0x0c + item * 2),
      targetOffset + 8 + item * 2,
    );
  }
  compactPersonal[targetOffset + 14] = personal[sourceOffset + 0x12];
  for (let ability = 0; ability < 3; ability += 1) {
    compactPersonal.writeUInt16LE(
      personal.readUInt16LE(sourceOffset + 0x18 + ability * 2),
      targetOffset + 15 + ability * 2,
    );
  }
}

function cppSlot(value) {
  return `{ ${value.species}, ${value.minLevel}, ${value.maxLevel} }`;
}

function cppArea(value) {
  const rates = [
    value.rates.grass,
    value.rates.surfing,
    value.rates.oldRod,
    value.rates.goodRod,
    value.rates.superRod,
  ].join(", ");
  const slots = [
    ...value.grass,
    ...value.surfing,
    ...value.oldRod,
    ...value.goodRod,
    ...value.superRod,
  ]
    .map(cppSlot)
    .join(", ");
  return `    { ${value.location}, { ${rates} }, {{ ${slots} }}, { ${value.swarm.join(", ")} }, { ${value.day.join(", ")} }, { ${value.night.join(", ")} }, { ${value.radar.join(", ")} } }`;
}

function cppHoney(value) {
  return `    { ${value.location}, {{ ${value.groups.flat().map(cppSlot).join(", ")} }} }`;
}

function cppArray(name, values, formatter, type) {
  return [
    `constexpr std::array<${type}, ${values.length}> ${name} = {{`,
    values.map(formatter).join(",\n"),
    "}};",
    "",
  ].join("\n");
}

const encoded = compactPersonal.toString("base64");
const personalLines = encoded.match(/.{1,100}/g) ?? [];
const include = [
  "// Generated from EncounterTableGenerator BDSP tables and PokeFinder 4.3.2 personal_bdsp.bin.",
  "// GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen8_wild_data.mjs.",
  cppArray("gen8WildBdAreas", data.brilliantdiamond.areas, cppArea, "RawArea"),
  cppArray("gen8WildSpAreas", data.shiningpearl.areas, cppArea, "RawArea"),
  cppArray(
    "gen8WildBdHoney",
    data.brilliantdiamond.honey,
    cppHoney,
    "RawHoneyArea",
  ),
  cppArray(
    "gen8WildSpHoney",
    data.shiningpearl.honey,
    cppHoney,
    "RawHoneyArea",
  ),
  "constexpr std::array<std::uint8_t, 21> gen8WildHoneyLocations = { " +
    honeyLocations.join(", ") +
    " };",
  "constexpr std::array<std::uint16_t, 12> gen8WildGreatMarsh = { " +
    greatMarsh.join(", ") +
    " };",
  "constexpr std::array<std::uint16_t, 14> gen8WildGreatMarshNationalDex = { " +
    greatMarshNationalDex.join(", ") +
    " };",
  "constexpr std::array<std::uint16_t, 16> gen8WildTrophyGarden = { " +
    trophyGarden.join(", ") +
    " };",
  "constexpr std::string_view gen8WildPersonalBase64 =",
  ...personalLines.map((line, index) =>
    index === personalLines.length - 1 ? `    "${line}";` : `    "${line}"`,
  ),
  "",
].join("\n");

await writeFile(
  path.join(
    projectRoot,
    "wasm",
    "modules",
    "gen8wild",
    "bridge",
    "wild_data.inc",
  ),
  include,
  "utf8",
);
