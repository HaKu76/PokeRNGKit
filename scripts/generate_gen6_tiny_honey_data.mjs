import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot =
  "C:/Users/Hakuhiro/Desktop/project/TinyFinder-main/TinyFinder";
const outputPath = path.join(root, "src/features/gen6tinyhoney/data.ts");

const properties = [
  "GrassTable",
  "LongTable",
  "CaveTable",
  "RedTable",
  "YellowTable",
  "PurpleTable",
  "SwampTable",
  "SurfTable",
  "WildLevel",
  "RedLevel",
  "YellowLevel",
  "PurpleLevel",
  "SwampLevel",
  "SurfLevel",
  "HordeTable1",
  "RideTable",
];

function balanced(text, start) {
  const open = text.indexOf("{", start);
  if (open < 0) throw new Error(`Missing block after ${start}`);
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    else if (text[index] === "}" && --depth === 0)
      return [text.slice(open + 1, index), index + 1];
  }
  throw new Error("Unterminated block");
}

function objectBodies(text, marker) {
  const result = [];
  const pattern = new RegExp(`new\\s+${marker}\\s*\\{`, "g");
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const [body, end] = balanced(text, match.index);
    result.push(body);
    pattern.lastIndex = end;
  }
  return result;
}

function number(body, name, fallback = 0) {
  const match = body.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`));
  return match ? Number(match[1]) : fallback;
}

function array(body, name) {
  const match = body.match(
    new RegExp(`\\b${name}\\s*=\\s*new\\s+[^\\{]*\\{([^}]*)\\}`),
  );
  return match
    ? [...match[1].matchAll(/-?\d+/g)].map((entry) => Number(entry[0]))
    : [];
}

function cases(text) {
  const result = new Map();
  const pattern = /\bcase\s+(\d+)\s*:/g;
  const matches = [...text.matchAll(pattern)];
  for (let index = 0; index < matches.length; index += 1) {
    const start = matches[index].index + matches[index][0].length;
    const end = matches[index + 1]?.index ?? text.length;
    result.set(Number(matches[index][1]), text.slice(start, end));
  }
  return result;
}

function selectBranches(text, variable, value) {
  let output = "";
  let cursor = 0;
  while (cursor < text.length) {
    const match = text
      .slice(cursor)
      .match(new RegExp(`if\\s*\\(\\s*${variable}\\s*\\)`));
    if (!match) return output + text.slice(cursor);
    const conditionStart = cursor + match.index;
    output += text.slice(cursor, conditionStart);
    const trueStart = text.indexOf("{", conditionStart);
    if (trueStart < 0) throw new Error(`Missing ${variable} branch`);
    const [trueBody, trueEnd] = balanced(text, trueStart);
    let after = trueEnd;
    while (/\s/.test(text[after] ?? "")) after += 1;
    let falseBody = "";
    if (text.slice(after).startsWith("else")) {
      const falseStart = text.indexOf("{", after + 4);
      const parsed = balanced(text, falseStart);
      falseBody = parsed[0];
      after = parsed[1];
    }
    output += selectBranches(value ? trueBody : falseBody, variable, value);
    cursor = after;
  }
  return output;
}

function parseLocationMetadata(file, className) {
  const text = fs.readFileSync(path.join(sourceRoot, "Database", file), "utf8");
  return objectBodies(text, className).map((body) => ({
    map: number(body, "Map"),
    name: body.match(/\bName\s*=\s*"([^"]+)"/)?.[1] ?? "",
    npc: number(body, "NPC"),
    encRatio: number(body, "Enc_Ratio"),
    bagAdvances: number(body, "Bag_Advances"),
    firstLongBlinkRand: number(body, "FirstLongBlinkRand"),
    firstLongBlinkRandEmu: number(body, "FirstLongBlinkRand_Emu"),
  }));
}

function parseVariantTable(file, variable, value) {
  const text = fs.readFileSync(path.join(sourceRoot, "Database", file), "utf8");
  const result = new Map();
  for (const [map, block] of cases(text)) {
    const selected = selectBranches(
      block.replace(/\/\/.*$/gm, ""),
      variable,
      value,
    );
    const tables = {};
    for (const property of properties) {
      const values = array(selected, property);
      if (values.length) tables[property] = values;
    }
    result.set(map, tables);
  }
  return result;
}

function makeAreas(metadata, table, game) {
  const areas = [];
  for (const location of metadata) {
    const values = table.get(location.map);
    if (!values) continue;
    const choices = [
      ["grass", "GrassTable", "WildLevel", 0],
      ["long-grass", "LongTable", "WildLevel", 0],
      ["cave", "CaveTable", "WildLevel", 0],
      ["red-flowers", "RedTable", "RedLevel", 0],
      ["yellow-flowers", "YellowTable", "YellowLevel", 0],
      ["purple-flowers", "PurpleTable", "PurpleLevel", 0],
      ["swamp", "SwampTable", "SwampLevel", 4],
      ["water", "SurfTable", "SurfLevel", 4],
    ];
    const hordeMode = Boolean(values.HordeTable1 || values.RideTable);
    for (const [mode, tableName, levelName, slotType] of choices) {
      const species = values[tableName];
      const levels = values[levelName];
      if (!species?.length || !levels?.length) continue;
      if (hordeMode && slotType === 0) continue;
      areas.push({
        id: `${game}-${mode}-${location.map}-${areas.length}`,
        game,
        map: location.map,
        name: location.name,
        mode,
        slotType,
        species,
        levels,
        npc: location.npc,
        bagAdvances: location.bagAdvances,
        firstLongBlinkRand: location.firstLongBlinkRand,
        firstLongBlinkRandEmu: location.firstLongBlinkRandEmu,
      });
    }
  }
  return areas;
}

const xyMetadata = parseLocationMetadata("LocationsXY.cs", "Location");
const orasMetadata = parseLocationMetadata("LocationsORAS.cs", "Location");
const areas = [
  ...makeAreas(xyMetadata, parseVariantTable("TableXY.cs", "X", true), "x"),
  ...makeAreas(xyMetadata, parseVariantTable("TableXY.cs", "X", false), "y"),
  ...makeAreas(
    orasMetadata,
    parseVariantTable("TableORAS.cs", "OmegaRuby", true),
    "omega-ruby",
  ),
  ...makeAreas(
    orasMetadata,
    parseVariantTable("TableORAS.cs", "OmegaRuby", false),
    "alpha-sapphire",
  ),
].filter(
  (area) => area.firstLongBlinkRand > 0 && area.firstLongBlinkRandEmu > 0,
);

const sourceNotice = `/*\n * Generated from TinyFinder Database/Locations*.cs and Database/Table*.cs.\n * TinyFinder is GPL-3.0-or-later; retain upstream attribution when distributing.\n */\n`;
const output = `${sourceNotice}\nexport type Gen6TinyHoneyGame = "x" | "y" | "omega-ruby" | "alpha-sapphire";\nexport type Gen6TinyHoneyMode = "grass" | "long-grass" | "cave" | "red-flowers" | "yellow-flowers" | "purple-flowers" | "swamp" | "water";\nexport interface Gen6TinyHoneyArea {\n  readonly id: string;\n  readonly game: Gen6TinyHoneyGame;\n  readonly map: number;\n  readonly name: string;\n  readonly mode: Gen6TinyHoneyMode;\n  readonly slotType: 0 | 4;\n  readonly species: readonly number[];\n  readonly levels: readonly number[];\n  readonly npc: number;\n  readonly bagAdvances: number;\n  readonly firstLongBlinkRand: number;\n  readonly firstLongBlinkRandEmu: number;\n}\nexport const GEN6_TINY_HONEY_AREAS: readonly Gen6TinyHoneyArea[] = ${JSON.stringify(areas)};\nexport const GEN6_TINY_HONEY_SLOT_DISTRIBUTIONS = { normal: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1], water: [50, 30, 15, 4, 1] } as const;\n`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
globalThis.console.log(`Generated ${areas.length} TinyFinder Honey areas.`);
