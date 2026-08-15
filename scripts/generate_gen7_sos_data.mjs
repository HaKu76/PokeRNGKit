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

function balancedBlock(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing source marker: ${marker}`);
  const start = text.indexOf("{", markerIndex);
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    if (text[index] === "{") depth++;
    if (text[index] === "}" && --depth === 0) {
      return text.slice(start + 1, index);
    }
  }
  throw new Error(`Unterminated source block after ${marker}.`);
}

function objectBodies(text) {
  const pattern = /new\s+SOSAllies\s*\{/g;
  const objects = [];
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const start = text.indexOf("{", match.index);
    let depth = 0;
    for (let index = start; index < text.length; index++) {
      if (text[index] === "{") depth++;
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

function nullableBooleanProperty(body, name) {
  const match = body.match(new RegExp(`\\b${name}\\s*=\\s*(true|false|null)`));
  if (!match || match[1] === "null") return null;
  return match[1] === "true";
}

const babySpecies = new Set([
  30, 31, 172, 173, 174, 175, 201, 236, 238, 239, 240, 298, 360, 406, 433, 438,
  439, 440, 446, 447, 458,
]);

function personalEntry(personal, species, form) {
  const size = 0x54;
  const baseOffset = species * size;
  const formIndex = personal.readUInt16LE(baseOffset + 0x1c);
  const formCount = personal[baseOffset + 0x20];
  const index =
    form > 0 && formIndex > 0 && form < formCount
      ? formIndex + form - 1
      : species;
  const offset = index * size;
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
    callRate: personal[offset + 0x1b],
  };
}

const sosAlliesPath = option("--sos-allies");
const personalPath = option("--personal");
const outputPath = option("--output");
const [sosSource, personal] = await Promise.all([
  readFile(sosAlliesPath, "utf8"),
  readFile(personalPath),
]);

const rules = objectBodies(
  balancedBlock(sosSource, "private static SOSAllies[] Table"),
).map((body) => ({
  species: numberProperty(body, "Species"),
  slotType: numberProperty(body, "slottype"),
  allies: numberArrayProperty(body, "Ally"),
  baby: numberProperty(body, "Baby"),
  locations: numberArrayProperty(body, "Locations"),
  ultra: nullableBooleanProperty(body, "Ultra"),
}));

const personalEntries = {};
const size = 0x54;
const maximumSpecies = 807;
for (let species = 1; species <= maximumSpecies; species++) {
  const baseOffset = species * size;
  const formCount = personal[baseOffset + 0x20];
  for (let form = 0; form < Math.max(1, formCount); form++) {
    const specForm = species | (form << 11);
    personalEntries[specForm] = personalEntry(personal, species, form);
  }
}

const source = `/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled SOS ally and personal data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen7_sos_data.mjs.
 */

export interface Gen7SosAllyRule {
  readonly species: number;
  readonly slotType: number;
  readonly allies: readonly number[];
  readonly baby: number;
  readonly locations: readonly number[];
  readonly ultra: boolean | null;
}

export interface Gen7SosPersonal {
  readonly species: number;
  readonly form: number;
  readonly gender: number;
  readonly randomGender: boolean;
  readonly fixedThreeIv: boolean;
  readonly electric: boolean;
  readonly steel: boolean;
  readonly callRate: number;
}

export const GEN7_SOS_ALLY_RULES = ${JSON.stringify(rules, null, 2)} as const satisfies readonly Gen7SosAllyRule[];

export const GEN7_SOS_PERSONAL = ${JSON.stringify(personalEntries, null, 2)} as const satisfies Readonly<Record<string, Gen7SosPersonal>>;
`;

await writeFile(outputPath, source, "utf8");
