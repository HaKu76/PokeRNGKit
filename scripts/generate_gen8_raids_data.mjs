import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const pokeFinderRoot =
  process.env.POKEFINDER_ROOT ??
  "C:\\Users\\Hakuhiro\\Desktop\\project\\PokeFinder-master";
const encounterRoot =
  process.env.ENCOUNTER_TABLE_ROOT ??
  "C:\\Users\\Hakuhiro\\AppData\\Local\\Temp\\EncounterTableGenerator-7769c1df-20260817\\EncounterTableGenerator-7769c1df80be93761fe6479d51cbf2fe7a7dc4f9\\Gen8\\swsh";

const nests = JSON.parse(
  await readFile(path.join(encounterRoot, "nests.json"), "utf8"),
).Tables;
const events = await Promise.all(
  Array.from({ length: 69 }, async (_, index) =>
    JSON.parse(
      await readFile(
        path.join(encounterRoot, `event${index + 1}.json`),
        "utf8",
      ),
    ),
  ),
);
const encountersSource = await readFile(
  path.join(pokeFinderRoot, "Core", "Gen8", "Encounters8.cpp"),
  "utf8",
);

const denInfo = [
  ...encountersSource.matchAll(
    /\{\s*0x([0-9a-f]+),\s*0x([0-9a-f]+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\}/gi,
  ),
].map((match, index) => ({
  index,
  normalHash: BigInt(`0x${match[1]}`),
  rareHash: BigInt(`0x${match[2]}`),
  location: Number(match[3]),
  x: Number(match[4]),
  y: Number(match[5]),
}));
if (denInfo.length !== 276) {
  throw new Error(`Expected 276 den mappings, received ${denInfo.length}`);
}

function template(entry, event = false) {
  const stars = event ? entry.Probabilities : entry.Stars;
  return {
    species: entry.Species,
    form: entry.AltForm,
    shiny: event ? entry.ShinyFlag : 0,
    ability: entry.Ability,
    gender: entry.Gender,
    ivCount: entry.FlawlessIVs,
    gigantamax: Boolean(entry.IsGigantamax),
    starMask: stars.reduce(
      (mask, value, index) =>
        Number(value) !== 0 ? mask | (1 << index) : mask,
      0,
    ),
    level: event ? entry.Level : 0,
  };
}
function normalTemplates(entries) {
  if (entries.length !== 12) throw new Error("Normal den entry count changed");
  return entries.map((entry) => template(entry));
}
function eventTemplates(entries) {
  return entries
    .filter((entry) => entry.Probabilities.some((value) => Number(value) !== 0))
    .map((entry) => template(entry, true));
}

nests.sort((left, right) =>
  BigInt(`0x${left.TableID}`) < BigInt(`0x${right.TableID}`)
    ? -1
    : BigInt(`0x${left.TableID}`) > BigInt(`0x${right.TableID}`)
      ? 1
      : 0,
);
const denRows = nests.map((table) => ({
  hash: BigInt(`0x${table.TableID}`),
  sword: normalTemplates(table.SwordEntries),
  shield: normalTemplates(table.ShieldEntries),
}));
const eventRows = events.map((event) => ({
  sword: eventTemplates(event.Tables[0].Entries),
  shield: eventTemplates(event.Tables[1].Entries),
}));

const personal = await readFile(
  path.join(
    pokeFinderRoot,
    "Core",
    "Resources",
    "Personal",
    "Gen8",
    "personal_swsh.bin",
  ),
);
const personalRecordSize = 0xb0;
if (personal.length % personalRecordSize !== 0) {
  throw new Error(`Unexpected personal_swsh.bin length: ${personal.length}`);
}
const personalRows = [];
for (
  let species = 0;
  species < personal.length / personalRecordSize;
  species += 1
) {
  const offset = species * personalRecordSize;
  personalRows.push({
    stats: [0, 1, 2, 4, 5, 3].map((part) => personal[offset + part]),
    gender: personal[offset + 0x12],
    formCount: personal[offset + 0x20],
    formStatIndex: personal.readUInt16LE(offset + 0x1e),
    abilities: [0, 1, 2].map((index) =>
      personal.readUInt16LE(offset + 0x18 + index * 2),
    ),
  });
}

const tsTemplate = (value) =>
  `{ species: ${value.species}, form: ${value.form}, shiny: ${value.shiny}, ability: ${value.ability}, gender: ${value.gender}, ivCount: ${value.ivCount}, gigantamax: ${value.gigantamax}, starMask: ${value.starMask}, level: ${value.level} }`;
const tsRows = denRows
  .map(
    (row) =>
      `  { hash: "${row.hash.toString(16).padStart(16, "0")}", sword: [${row.sword.map(tsTemplate).join(", ")}], shield: [${row.shield.map(tsTemplate).join(", ")}] },`,
  )
  .join("\n");
const tsEvents = eventRows
  .map(
    (row) =>
      `  { sword: [${row.sword.map(tsTemplate).join(", ")}], shield: [${row.shield.map(tsTemplate).join(", ")}] },`,
  )
  .join("\n");
const tsInfo = denInfo
  .map(
    (row) =>
      `  { index: ${row.index}, normalHash: "${row.normalHash.toString(16).padStart(16, "0")}", rareHash: "${row.rareHash.toString(16).padStart(16, "0")}", location: ${row.location}, coordinate: [${row.x}, ${row.y}] },`,
  )
  .join("\n");
const tsPersonal = personalRows
  .map(
    (row) =>
      `  { stats: [${row.stats.join(", ")}], gender: ${row.gender}, formCount: ${row.formCount}, formStatIndex: ${row.formStatIndex}, abilities: [${row.abilities.join(", ")}] },`,
  )
  .join("\n");

const tsOutput = `// Generated from PokeFinder 4.3.2 EncounterTableGenerator data.
// Do not edit manually; run scripts/generate_gen8_raids_data.mjs.

export interface Gen8RaidTemplate {
  species: number;
  form: number;
  shiny: number;
  ability: number;
  gender: number;
  ivCount: number;
  gigantamax: boolean;
  starMask: number;
  level: number;
}
export interface Gen8RaidDen { hash: string; sword: readonly Gen8RaidTemplate[]; shield: readonly Gen8RaidTemplate[] }
export interface Gen8RaidEvent { sword: readonly Gen8RaidTemplate[]; shield: readonly Gen8RaidTemplate[] }
export interface Gen8DenInfo { index: number; normalHash: string; rareHash: string; location: number; coordinate: readonly [number, number] }
export interface Gen8RaidPersonal { stats: readonly [number, number, number, number, number, number]; gender: number; formCount: number; formStatIndex: number; abilities: readonly [number, number, number] }

export const GEN8_RAID_DENS: readonly Gen8RaidDen[] = [
${tsRows}
];
export const GEN8_RAID_EVENTS: readonly Gen8RaidEvent[] = [
${tsEvents}
];
export const GEN8_DEN_INFO: readonly Gen8DenInfo[] = [
${tsInfo}
];
export const GEN8_RAID_PERSONAL: readonly Gen8RaidPersonal[] = [
${tsPersonal}
];

export function getGen8RaidDen(index: number, rarity: 0 | 1) {
  const info = GEN8_DEN_INFO[index];
  if (!info) throw new RangeError("Invalid den index.");
  const hash = rarity === 0 ? info.normalHash : info.rareHash;
  const den = GEN8_RAID_DENS.find((entry) => entry.hash === hash);
  if (!den) throw new Error("Raid den data is incomplete.");
  return den;
}
export function getGen8RaidPersonal(species: number, form: number) {
  const base = GEN8_RAID_PERSONAL[species];
  if (!base) throw new RangeError("Invalid species.");
  if (form === 0 || base.formStatIndex === 0) return base;
  return GEN8_RAID_PERSONAL[base.formStatIndex + form - 1] ?? base;
}
`;
await writeFile(
  path.join(projectRoot, "src", "features", "gen8raids", "data.ts"),
  tsOutput,
  "utf8",
);

const cppTemplate = (value) =>
  `{ ${value.species}, ${value.form}, ${value.shiny}, ${value.ability}, ${value.gender}, ${value.ivCount}, ${value.gigantamax ? 1 : 0}, ${value.starMask}, ${value.level} }`;
const emptyTemplate = {
  species: 0,
  form: 0,
  shiny: 1,
  ability: 0,
  gender: 0,
  ivCount: 0,
  gigantamax: false,
  starMask: 0,
  level: 0,
};
const cppArray = (values, size) =>
  `{{ ${[...values, ...Array(Math.max(0, size - values.length)).fill(emptyTemplate)].map(cppTemplate).join(", ")} }}`;
const cppDens = denRows
  .map(
    (row) =>
      `{ 0x${row.hash.toString(16)}ULL, ${cppArray(row.sword, 12)}, ${cppArray(row.shield, 12)} }`,
  )
  .join(",\n");
const cppEvents = eventRows
  .map((row) => `{ ${cppArray(row.sword, 30)}, ${cppArray(row.shield, 30)} }`)
  .join(",\n");
const cppInfo = denInfo
  .map(
    (row) =>
      `{ 0x${row.normalHash.toString(16)}ULL, 0x${row.rareHash.toString(16)}ULL, ${row.location}, ${row.x}, ${row.y} }`,
  )
  .join(",\n");
const cppPersonal = personalRows
  .map(
    (row) =>
      `{ { ${row.stats.join(", ")} }, ${row.gender}, ${row.formCount}, ${row.formStatIndex}, { ${row.abilities.join(", ")} } }`,
  )
  .join(",\n");
const cppOutput = `// Generated from PokeFinder 4.3.2 EncounterTableGenerator data.
// Do not edit manually; run scripts/generate_gen8_raids_data.mjs.
constexpr std::array<Gen8RaidDen, ${denRows.length}> GEN8_RAID_DENS = {{
${cppDens}
}};
constexpr std::array<Gen8RaidEvent, ${eventRows.length}> GEN8_RAID_EVENTS = {{
${cppEvents}
}};
constexpr std::array<Gen8DenInfo, ${denInfo.length}> GEN8_DEN_INFO = {{
${cppInfo}
}};
constexpr std::array<Gen8RaidPersonal, ${personalRows.length}> GEN8_RAID_PERSONAL = {{
${cppPersonal}
}};
`;
await writeFile(
  path.join(
    projectRoot,
    "wasm",
    "modules",
    "gen8raids",
    "bridge",
    "raid_data.inc",
  ),
  cppOutput,
  "utf8",
);
process.stdout.write(
  `Generated ${denRows.length} dens, ${eventRows.length} events, ${personalRows.length} personal records.\n`,
);
