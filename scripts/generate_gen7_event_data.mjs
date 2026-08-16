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

function readLines(text) {
  return text.replace(/\r/g, "").split("\n").filter(Boolean);
}

function parseSet(source, name) {
  const match = source.match(
    new RegExp(`${name}\\s*=\\s*new HashSet<int>\\s*\\{([\\s\\S]*?)\\};`),
  );
  if (!match) throw new Error(`Unable to find Pokemon.${name}.`);
  const values = match[1]
    .replace(/\/\/.*$/gm, "")
    .match(/\b\d+\b/g)
    ?.map((value) => Number.parseInt(value, 10));
  return new Set(values ?? []);
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
    form > 0 && formIndex > 0 && form < formCount
      ? formIndex + form - 1
      : species;
  const offset = index * size;
  if (offset + size > personal.length) {
    throw new Error(`Missing USUM personal form record ${species}:${form}.`);
  }
  return {
    genderRatio: personal[offset + 0x12],
    eggGroup: personal[offset + 0x16],
  };
}

const personalPath = option("--personal");
const pokemonPath = option("--pokemon");
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
  personal,
  pokemon,
  speciesEn,
  speciesJa,
  speciesZh,
  natureEn,
  natureJa,
  natureZh,
] = await Promise.all([
  readFile(personalPath),
  readFile(pokemonPath, "utf8"),
  readFile(textPaths.species.en, "utf8"),
  readFile(textPaths.species.ja, "utf8"),
  readFile(textPaths.species.zh, "utf8"),
  readFile(textPaths.natures.en, "utf8"),
  readFile(textPaths.natures.ja, "utf8"),
  readFile(textPaths.natures.zh, "utf8"),
]);

const battleForms = parseSet(pokemon, "BattleForms");
const babySpecies = parseSet(pokemon, "BabyMons");
const alolanForms = parseSet(pokemon, "AlolanForms");
const alolanDexSm = parseSet(pokemon, "AlolanDex_SM");
const alolanDexUsum = parseSet(pokemon, "AlolanDex_USUM");

const entries = Array.from({ length: 808 }, (_, species) => {
  const baseOffset = species * 0x54;
  const rawFormCount = personal[baseOffset + 0x20] ?? 1;
  const formCount = battleForms.has(species) ? 1 : Math.max(rawFormCount, 1);
  const forms = Array.from({ length: formCount }, (_, form) => {
    const entry = personalEntry(personal, species, form);
    return {
      genderRatio: entry.genderRatio,
      defaultPerfectIvCount:
        entry.eggGroup === 0x0f && !babySpecies.has(species) ? 3 : 0,
    };
  });
  const smNoDexEligible =
    species > 721 || alolanForms.has(species) || alolanDexSm.has(species);
  return {
    species,
    forms,
    smNoDexEligible,
    usumNoDexEligible: smNoDexEligible || alolanDexUsum.has(species),
  };
});

const species = {
  en: readLines(speciesEn).slice(0, 808),
  ja: readLines(speciesJa).slice(0, 808),
  zh: readLines(speciesZh).slice(0, 808),
};
const natures = {
  en: readLines(natureEn),
  ja: readLines(natureJa),
  zh: readLines(natureZh),
};

for (const [language, values] of Object.entries(species)) {
  if (values.length !== 808) {
    throw new Error(
      `Expected 808 ${language} species strings, got ${values.length}.`,
    );
  }
}
for (const [language, values] of Object.entries(natures)) {
  if (values.length !== 25) {
    throw new Error(
      `Expected 25 ${language} nature strings, got ${values.length}.`,
    );
  }
}

const source = `/*!
 * Generated from 3DSRNGTool revision 359bdd7a9ff7c145fec12302cf43da932923fa62.
 * 3DSRNGTool is licensed under MIT; bundled species and personal data retain
 * their upstream attribution. Do not hand-edit; rerun
 * scripts/generate_gen7_event_data.mjs.
 */

export type Gen7EventGameVersion =
  | "sun"
  | "moon"
  | "ultra-sun"
  | "ultra-moon";

export interface Gen7EventPersonalForm {
  readonly genderRatio: number;
  readonly defaultPerfectIvCount: number;
}

export interface Gen7EventPersonalEntry {
  readonly species: number;
  readonly forms: readonly Gen7EventPersonalForm[];
  readonly smNoDexEligible: boolean;
  readonly usumNoDexEligible: boolean;
}

export const GEN7_EVENT_SPECIES = ${JSON.stringify(species, null, 2)} as const;

export const GEN7_EVENT_NATURES = ${JSON.stringify(natures, null, 2)} as const;

export const GEN7_EVENT_PERSONAL = ${JSON.stringify(entries, null, 2)} as const satisfies readonly Gen7EventPersonalEntry[];
`;

await writeFile(outputPath, source, "utf8");
