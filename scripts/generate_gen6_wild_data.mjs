import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstreamRoot =
  "C:/Users/Hakuhiro/Documents/Github/3DSRNGTool_CHN/3DSRNGTool";
const locationPath = path.join(
  upstreamRoot,
  "Gen6/Gen6Encounter/LocationTable6.cs",
);
const personalPath = path.join(upstreamRoot, "Resources/bytes/personal_ao");
const locationText = fs.readFileSync(locationPath, "utf8");
const personal = fs.readFileSync(personalPath);
const outputPath = path.join(root, "src/features/gen6wild/data.ts");

const GEN6_WILD_BABY_SPECIES = [
  30, 31, 172, 173, 174, 175, 201, 236, 238, 239, 240, 298, 360, 406, 433, 438,
  439, 440, 446, 447, 458,
];
const GEN6_WILD_UNDISCOVERED_SPECIES = Array.from(
  { length: 721 },
  (_, species) => species + 1,
).filter((species) => personal[species * 0x50 + 0x16] === 0x0f);

function balancedBlock(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing source marker: ${marker}`);
  const start = text.indexOf("{", markerIndex);
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}" && --depth === 0)
      return text.slice(start + 1, index);
  }
  throw new Error(`Unterminated source block after ${marker}.`);
}

function objectBodies(text, className) {
  const pattern = new RegExp(`new\\s+${className}\\s*\\{`, "g");
  const objects = [];
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const start = text.indexOf("{", match.index);
    let depth = 0;
    for (let index = start; index < text.length; index += 1) {
      if (text[index] === "{") depth += 1;
      if (text[index] === "}" && --depth === 0) {
        objects.push(text.slice(start + 1, index));
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

function numberArray(body, name) {
  const match = body.match(
    new RegExp(`\\b${name}\\s*=\\s*new\\s*\\[\\s*\\]\\s*\\{([^}]*)\\}`),
  );
  if (match)
    return [...match[1].matchAll(/-?\d+/g)].map((entry) => Number(entry[0]));
  const scalar = body.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+)`));
  return scalar ? [Number.parseInt(scalar[1], 10)] : [];
}

function parseResource(fileName) {
  const values = fs
    .readFileSync(path.join(upstreamRoot, "Resources/text", fileName), "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .split("\n");
  return values;
}

function area(location, index, species, levels, type, version) {
  const expandedSpecies = species.map((value) => value || 0);
  const expandedLevels = levels.map((value) => value || levels.at(-1) || 1);
  return {
    id: `${version}-${type}-${location}-${index}`,
    version,
    type,
    location,
    index,
    species: expandedSpecies,
    levels: expandedLevels,
  };
}

function parseAreas(marker, className, type, version) {
  return objectBodies(balancedBlock(locationText, marker), className).map(
    (body) =>
      area(
        numberProperty(body, "Location"),
        numberProperty(body, "idx"),
        numberArray(body, "Species"),
        numberArray(body, "Level"),
        type,
        version,
      ),
  );
}

function parseMirage() {
  return objectBodies(
    balancedBlock(locationText, "ORASTable"),
    "EncounterArea_ORAS",
  )
    .map((body) => {
      const species = numberArray(body, "Species");
      if (species.length !== 4) return null;
      const levels = [38, 37, 36, 38, 37, 36, 38, 37, 36, 36, 37, 38];
      return area(
        numberProperty(body, "Location"),
        numberProperty(body, "idx"),
        species.flatMap((value) => [value, value, value]),
        levels,
        "normal",
        "omega-ruby",
      );
    })
    .filter(Boolean);
}

const areas = [
  ...parseMirage(),
  ...parseAreas(
    "public readonly static HordeArea_ORAS[] Horde_ORAS",
    "HordeArea_ORAS",
    "horde",
    "omega-ruby",
  ),
  ...parseAreas(
    "public static readonly HordeArea_XY[] Horde_XY",
    "HordeArea_XY",
    "horde",
    "x",
  ),
  ...parseAreas(
    "public static readonly RockSmashArea6[] RockSmash_ORAS",
    "RockSmashArea6",
    "rock-smash",
    "omega-ruby",
  ),
  ...parseAreas(
    "public static readonly RockSmashArea6[] RockSmash_XY",
    "RockSmashArea6",
    "rock-smash",
    "x",
  ),
  ...parseAreas(
    "public static readonly FishingArea6[] Fishing_ORAS",
    "FishingArea6",
    "fishing",
    "omega-ruby",
  ),
  ...parseAreas(
    "public static readonly FishingArea6[] Fishing_XY",
    "FishingArea6",
    "fishing",
    "x",
  ),
];

const locationEn = parseResource("text_Location_xy_en.txt");
const locationJa = parseResource("text_Location_xy_ja.txt");
const locationZh = parseResource("text_Location_xy_zh.txt");

const ts = `/*
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled encounter and location data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen6_wild_data.mjs.
 */

export type Gen6WildVersion = "x" | "y" | "omega-ruby" | "alpha-sapphire";
export type Gen6WildType = "normal" | "horde" | "rock-smash" | "fishing";

export interface Gen6WildArea {
  readonly id: string;
  readonly version: "x" | "omega-ruby";
  readonly type: Gen6WildType;
  readonly location: number;
  readonly index: number;
  readonly species: readonly number[];
  readonly levels: readonly number[];
}

export const GEN6_WILD_SLOT_DISTRIBUTIONS = {
  normal: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1],
  horde: [20, 20, 20, 20, 20],
  "rock-smash": [50, 30, 15, 4, 1],
  fishing: [60, 35, 5],
} as const;

export const GEN6_WILD_BABY_SPECIES: readonly number[] = ${JSON.stringify(GEN6_WILD_BABY_SPECIES)};
export const GEN6_WILD_UNDISCOVERED_SPECIES: readonly number[] = ${JSON.stringify(GEN6_WILD_UNDISCOVERED_SPECIES)};

export const GEN6_WILD_AREAS: readonly Gen6WildArea[] = ${JSON.stringify(areas)};
export const GEN6_WILD_LOCATIONS = {
  en: ${JSON.stringify(locationEn)},
  ja: ${JSON.stringify(locationJa)},
  zh: ${JSON.stringify(locationZh)},
} as const;
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, ts);
process.stdout.write(`Generated ${areas.length} Gen VI Wild areas.\n`);
