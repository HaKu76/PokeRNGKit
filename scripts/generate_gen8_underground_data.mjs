import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const pokeFinderRoot =
  process.env.POKEFINDER_ROOT ??
  "C:\\Users\\Hakuhiro\\Desktop\\project\\PokeFinder-master";
const encounterRoot =
  process.env.ENCOUNTER_TABLE_ROOT ??
  "C:\\Users\\Hakuhiro\\AppData\\Local\\Temp\\EncounterTableGenerator-7769c1df-20260817\\EncounterTableGenerator-7769c1df80be93761fe6479d51cbf2fe7a7dc4f9";
const bdspRoot = path.join(encounterRoot, "Gen8", "bdsp");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const pokemonData = (await readJson(path.join(bdspRoot, "UgPokemonData.json")))
  .table;
const randMarks = (await readJson(path.join(bdspRoot, "UgRandMark.json")))
  .table;
const specialPokemon = (
  await readJson(path.join(bdspRoot, "UgSpecialPokemon.json"))
).Sheet1;
const personal = await readFile(
  path.join(
    pokeFinderRoot,
    "Core",
    "Resources",
    "Personal",
    "Gen8",
    "personal_bdsp.bin",
  ),
);
const generatorSource = await readFile(
  path.join(
    pokeFinderRoot,
    "Core",
    "Gen8",
    "Generators",
    "UndergroundGenerator.cpp",
  ),
  "utf8",
);

const encounterTables = new Map();
for (const fileName of new Set(randMarks.map((entry) => entry.FileName))) {
  encounterTables.set(
    fileName,
    (await readJson(path.join(bdspRoot, `${fileName}.json`))).table,
  );
}

function unsigned16(value) {
  const data = Buffer.alloc(2);
  data.writeUInt16LE(value);
  return data;
}

function packArea(area) {
  const header = Buffer.from([
    area.location,
    area.min,
    area.max,
    area.pokemon.length,
    area.special.length,
    ...area.typeRates,
  ]);
  const special = Buffer.concat(
    area.special.map((entry) =>
      Buffer.concat([unsigned16(entry.rate), unsigned16(entry.species)]),
    ),
  );
  const pokemon = Buffer.concat(
    area.pokemon.map((entry) =>
      Buffer.concat([
        unsigned16(entry.species),
        Buffer.from([
          ...entry.flagRates,
          entry.flag,
          entry.rateup,
          entry.size,
          0,
        ]),
      ]),
    ),
  );
  return Buffer.concat([header, special, pokemon]);
}

function createAreas(version) {
  return Array.from({ length: 18 }, (_, index) => {
    const location = index + 2;
    const randMark = randMarks.find((entry) => entry.id === location);
    if (!randMark) throw new Error(`Missing underground room ${location}.`);
    const encounters = encounterTables.get(randMark.FileName);
    if (!encounters)
      throw new Error(`Missing encounter table ${randMark.FileName}.`);

    const special = specialPokemon
      .filter(
        (entry) =>
          entry.id === location &&
          (version === "brilliantdiamond"
            ? entry.version !== 3
            : entry.version !== 2),
      )
      .map((entry) => ({
        rate:
          version === "brilliantdiamond"
            ? entry.Dspecialrate
            : entry.Pspecialrate,
        species: entry.monsno,
      }));
    if (version === "brilliantdiamond")
      special.sort((left, right) => right.rate - left.rate);
    else special.sort((left, right) => right.species - left.species);

    const pokemon = encounters
      .filter((entry) =>
        version === "brilliantdiamond"
          ? entry.version !== 3
          : entry.version !== 2,
      )
      .map((entry) => {
        const data = pokemonData.find(
          (pokemonEntry) => pokemonEntry.monsno === entry.monsno,
        );
        if (!data)
          throw new Error(`Missing underground species ${entry.monsno}.`);
        return {
          species: entry.monsno,
          flagRates: data.flagrate,
          flag: entry.zukanflag,
          rateup: data.rateup,
          size: data.size,
        };
      });
    return {
      location,
      min: randMark.min,
      max: randMark.max,
      typeRates: randMark.typerate,
      special,
      pokemon,
    };
  });
}

const areas = {
  brilliantdiamond: createAreas("brilliantdiamond"),
  shiningpearl: createAreas("shiningpearl"),
};
const bdEncounterData = Buffer.concat(areas.brilliantdiamond.map(packArea));
const spEncounterData = Buffer.concat(areas.shiningpearl.map(packArea));
if (bdEncounterData.length !== 9306 || spEncounterData.length !== 9410) {
  throw new Error(
    `Unexpected underground data length: ${bdEncounterData.length}/${spEncounterData.length}.`,
  );
}

const eggMoves = [
  ...generatorSource.matchAll(/EggMoveList\((\d+),\s*(\d+),\s*\{([^}]*)\}\)/g),
].map((match) => ({
  count: Number(match[1]),
  species: Number(match[2]),
  moves: match[3]
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value)),
}));
if (
  eggMoves.length !== 141 ||
  eggMoves.some(
    (entry) => entry.moves.length !== 16 || entry.count < 1 || entry.count > 16,
  )
) {
  throw new Error(`Unexpected egg move table: ${eggMoves.length} entries.`);
}

const personalRecordSize = 0x44;
const speciesCount = 494;
if (
  personal.length % personalRecordSize !== 0 ||
  personal.length < speciesCount * personalRecordSize
) {
  throw new Error(`Unexpected personal_bdsp.bin length: ${personal.length}.`);
}
const compactPersonal = Buffer.alloc(speciesCount * 23);
for (let species = 0; species < speciesCount; species += 1) {
  const source = species * personalRecordSize;
  const target = species * 23;
  [0, 1, 2, 4, 5, 3].forEach((offset, index) => {
    compactPersonal[target + index] = personal[source + offset];
  });
  compactPersonal[target + 6] = personal[source + 6];
  compactPersonal[target + 7] = personal[source + 7];
  for (let item = 0; item < 3; item += 1) {
    compactPersonal.writeUInt16LE(
      personal.readUInt16LE(source + 0x0c + item * 2),
      target + 8 + item * 2,
    );
  }
  compactPersonal[target + 14] = personal[source + 0x12];
  for (let ability = 0; ability < 3; ability += 1) {
    compactPersonal.writeUInt16LE(
      personal.readUInt16LE(source + 0x18 + ability * 2),
      target + 15 + ability * 2,
    );
  }
  compactPersonal.writeUInt16LE(
    personal.readUInt16LE(source + 0x3e),
    target + 21,
  );
}

async function localizedLocations(language) {
  const lines = (
    await readFile(
      path.join(
        pokeFinderRoot,
        "Core",
        "Resources",
        "i18n",
        language,
        `bdsp_${language}.txt`,
      ),
      "utf8",
    )
  ).split(/\r?\n/);
  return Object.fromEntries(
    lines
      .map((line) => line.match(/^(\d+),(.*)$/))
      .filter(Boolean)
      .map((match) => [Number(match[1]), match[2]]),
  );
}

async function localizedMoves(language) {
  // The PokeFinder 4.3.2 archive duplicates the Italian move list under ja.
  // Keep the exact English source labels instead of publishing the wrong language.
  const sourceLanguage = language === "ja" ? "en" : language;
  return (
    await readFile(
      path.join(
        pokeFinderRoot,
        "Core",
        "Resources",
        "i18n",
        sourceLanguage,
        `moves_${sourceLanguage}.txt`,
      ),
      "utf8",
    )
  ).split(/\r?\n/);
}

async function localizedItems(language) {
  return Object.fromEntries(
    (
      await readFile(
        path.join(
          pokeFinderRoot,
          "Core",
          "Resources",
          "i18n",
          language,
          `items_${language}.txt`,
        ),
        "utf8",
      )
    )
      .split(/\r?\n/)
      .map((line) => line.match(/^(\d+),(.*)$/))
      .filter(Boolean)
      .map((match) => [Number(match[1]), match[2]]),
  );
}

const languages = ["en", "ja", "zh"];
const locations = Object.fromEntries(
  await Promise.all(
    languages.map(async (language) => [
      language,
      await localizedLocations(language),
    ]),
  ),
);
const moves = Object.fromEntries(
  await Promise.all(
    languages.map(async (language) => [
      language,
      await localizedMoves(language),
    ]),
  ),
);
const items = Object.fromEntries(
  await Promise.all(
    languages.map(async (language) => [
      language,
      await localizedItems(language),
    ]),
  ),
);
const usedMoves = new Set(
  eggMoves.flatMap((entry) => entry.moves.slice(0, entry.count)),
);
const usedItems = new Set([0]);
for (let species = 0; species < speciesCount; species += 1) {
  const offset = species * personalRecordSize;
  for (let item = 0; item < 3; item += 1)
    usedItems.add(personal.readUInt16LE(offset + 0x0c + item * 2));
}

const uiAreas = Object.fromEntries(
  Object.entries(areas).map(([version, versionAreas]) => [
    version,
    versionAreas.map((area) => ({
      location: area.location,
      pokemon: area.pokemon.map((entry) => ({
        species: entry.species,
        flag: entry.flag,
      })),
      special: area.special.map((entry) => entry.species),
    })),
  ]),
);
const localizedMoveMap = Object.fromEntries(
  languages.map((language) => [
    language,
    Object.fromEntries(
      [...usedMoves]
        .sort((left, right) => left - right)
        .map((move) => [move, moves[language][move] ?? String(move)]),
    ),
  ]),
);
const localizedItemMap = Object.fromEntries(
  languages.map((language) => [
    language,
    Object.fromEntries(
      [...usedItems]
        .sort((left, right) => left - right)
        .map((item) => [item, items[language][item] ?? String(item)]),
    ),
  ]),
);
const localizedLocationMap = Object.fromEntries(
  languages.map((language) => [
    language,
    Object.fromEntries(
      Array.from({ length: 18 }, (_, index) => index + 183).map((location) => [
        location - 181,
        locations[language][location] ?? String(location),
      ]),
    ),
  ]),
);

const typeScript = `/*!
 * Generated from EncounterTableGenerator revision 7769c1df80be93761fe6479d51cbf2fe7a7dc4f9
 * and PokeFinder 4.3.2 resources.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen8_underground_data.mjs.
 */

export type Gen8UndergroundVersion = "brilliantdiamond" | "shiningpearl";
export type Gen8UndergroundLanguage = "en" | "ja" | "zh";

export interface Gen8UndergroundAreaData {
  location: number;
  pokemon: readonly { species: number; flag: number }[];
  special: readonly number[];
}

export const GEN8_UNDERGROUND_AREAS = ${JSON.stringify(uiAreas, null, 2)} as const satisfies Record<Gen8UndergroundVersion, readonly Gen8UndergroundAreaData[]>;
export const GEN8_UNDERGROUND_LOCATIONS = ${JSON.stringify(localizedLocationMap, null, 2)} as const;
export const GEN8_UNDERGROUND_MOVES = ${JSON.stringify(localizedMoveMap, null, 2)} as const;
export const GEN8_UNDERGROUND_ITEMS = ${JSON.stringify(localizedItemMap, null, 2)} as const;

export function gen8UndergroundLanguage(language: string): Gen8UndergroundLanguage {
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("ja")) return "ja";
  return "en";
}

export function getGen8UndergroundArea(version: Gen8UndergroundVersion, location: number) {
  const area = GEN8_UNDERGROUND_AREAS[version].find((entry) => entry.location === location);
  if (!area) throw new RangeError("Invalid Gen 8 Underground location.");
  return area;
}

export function getGen8UndergroundSpecies(version: Gen8UndergroundVersion, location: number, storyFlag: number) {
  const area = getGen8UndergroundArea(version, location);
  return [...new Set([
    ...area.pokemon.filter((entry) => entry.flag <= storyFlag).map((entry) => entry.species),
    ...area.special,
  ])];
}

export function getGen8UndergroundLocationName(language: string, location: number) {
  const values = GEN8_UNDERGROUND_LOCATIONS[gen8UndergroundLanguage(language)] as Readonly<Record<string, string>>;
  return values[String(location)] ?? String(location);
}

export function getGen8UndergroundMoveName(language: string, move: number) {
  const values = GEN8_UNDERGROUND_MOVES[gen8UndergroundLanguage(language)] as Readonly<Record<string, string>>;
  return values[String(move)] ?? String(move);
}

export function getGen8UndergroundItemName(language: string, item: number) {
  const values = GEN8_UNDERGROUND_ITEMS[gen8UndergroundLanguage(language)] as Readonly<Record<string, string>>;
  return values[String(item)] ?? String(item);
}
`;

const wrapBase64 = (name, data, description) => {
  const encoded = data.toString("base64");
  const lines = encoded.match(/.{1,100}/g) ?? [];
  return [
    `// ${description}`,
    `constexpr std::string_view ${name} =`,
    ...lines.map((line, index) =>
      index === lines.length - 1 ? `    "${line}";` : `    "${line}"`,
    ),
  ].join("\n");
};
const cppEggMoves = eggMoves
  .map(
    (entry) =>
      `    { ${entry.species}, ${entry.count}, { ${entry.moves.join(", ")} } }`,
  )
  .join(",\n");
const include = `// Generated from EncounterTableGenerator revision 7769c1df80be93761fe6479d51cbf2fe7a7dc4f9
// and PokeFinder 4.3.2 resources. GPL-3.0-or-later.
${wrapBase64("gen8UndergroundBdBase64", bdEncounterData, "Brilliant Diamond underground encounter data.")}
${wrapBase64("gen8UndergroundSpBase64", spEncounterData, "Shining Pearl underground encounter data.")}
${wrapBase64("gen8UndergroundPersonalBase64", compactPersonal, "Records 0..493: stats, types, items, gender, abilities, hatch species.")}

constexpr std::array<EggMoveData, ${eggMoves.length}> gen8UndergroundEggMoves = {{
${cppEggMoves}
}};
`;

const featureDirectory = path.join(
  projectRoot,
  "src",
  "features",
  "gen8underground",
);
const bridgeDirectory = path.join(
  projectRoot,
  "wasm",
  "modules",
  "gen8underground",
  "bridge",
);
await mkdir(featureDirectory, { recursive: true });
await mkdir(bridgeDirectory, { recursive: true });
await writeFile(path.join(featureDirectory, "data.ts"), typeScript, "utf8");
await writeFile(
  path.join(bridgeDirectory, "underground_data.inc"),
  include,
  "utf8",
);
process.stdout.write(
  `Generated ${areas.brilliantdiamond.length} BD areas, ${areas.shiningpearl.length} SP areas, ${eggMoves.length} egg move rows, and ${speciesCount} personal records.\n`,
);
