import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`Missing required option: ${name}`);
  }
  return process.argv[index + 1];
}

function parseForms(text) {
  const forms = {};
  for (const line of text.trim().split(/\r?\n/)) {
    const [speciesText, formText, ...nameParts] = line.split(",");
    const species = Number(speciesText);
    const form = Number(formText);
    if (species > 493 || !Number.isInteger(form)) continue;
    forms[species] ??= [];
    forms[species][form] = nameParts.join(",");
  }
  return forms;
}

function parseSpecies(text) {
  return text.trim().split(/\r?\n/).slice(0, 493);
}

function compactPersonal(buffer) {
  const recordSize = 0x2c;
  if (buffer.length % recordSize !== 0) {
    throw new Error("Invalid PokeFinder Gen IV personal data length.");
  }
  const compact = Buffer.alloc((buffer.length / recordSize) * 8);
  for (let record = 0; record < buffer.length / recordSize; record++) {
    const source = record * recordSize;
    const target = record * 8;
    compact[target] = buffer[source];
    compact[target + 1] = buffer[source + 1];
    compact[target + 2] = buffer[source + 2];
    compact[target + 3] = buffer[source + 4];
    compact[target + 4] = buffer[source + 5];
    compact[target + 5] = buffer[source + 3];
    compact[target + 6] = buffer[source + 0x16];
    compact[target + 7] = buffer[source + 0x17] || buffer[source + 0x16];
  }
  return compact.toString("base64");
}

function parseCharacteristics(text) {
  return JSON.parse(text).map((entry) => Object.keys(entry)[0]);
}

const root = path.resolve(option("--pokerfinder-root"));
const output = path.resolve(option("--output"));
const resourceRoot = path.join(root, "Core", "Resources");
const personalRoot = path.join(resourceRoot, "Personal", "Gen4");
const i18nRoot = path.join(resourceRoot, "i18n");
const languages = ["en", "ja", "zh"];

const [diamond, pearl, platinum, hgss, ...localizedResources] =
  await Promise.all([
    readFile(path.join(personalRoot, "personal_d.bin")),
    readFile(path.join(personalRoot, "personal_p.bin")),
    readFile(path.join(personalRoot, "personal_pt.bin")),
    readFile(path.join(personalRoot, "personal_hgss.bin")),
    ...languages.flatMap((language) => [
      readFile(
        path.join(i18nRoot, language, `species_${language}.txt`),
        "utf8",
      ),
      readFile(path.join(i18nRoot, language, `forms_${language}.txt`), "utf8"),
      readFile(
        path.join(i18nRoot, language, `characteristic_${language}.json`),
        "utf8",
      ),
      readFile(
        path.join(i18nRoot, language, `abilities_${language}.txt`),
        "utf8",
      ),
    ]),
  ]);

const species = {};
const forms = {};
const characteristics = {};
const abilities = {};
languages.forEach((language, index) => {
  species[language] = parseSpecies(localizedResources[index * 4]);
  forms[language] = parseForms(localizedResources[index * 4 + 1]);
  characteristics[language] = parseCharacteristics(
    localizedResources[index * 4 + 2],
  );
  abilities[language] = localizedResources[index * 4 + 3].trim().split(/\r?\n/);
});

const source = `/*!
 * Generated from PokeFinder 4.3.2 Gen IV personal and i18n resources.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen4_iv_data.mjs.
 */

export type Gen4PersonalDataSet = "platinum" | "hgss";
export type Gen4PersonalVersion = "diamond" | "pearl" | Gen4PersonalDataSet;
export type Gen4IvDataLanguage = "en" | "ja" | "zh";
export type Gen4BaseStats = [number, number, number, number, number, number];

const encodedPersonal: Record<Gen4PersonalVersion, string> = ${JSON.stringify(
  {
    diamond: compactPersonal(diamond),
    pearl: compactPersonal(pearl),
    platinum: compactPersonal(platinum),
    hgss: compactPersonal(hgss),
  },
  null,
  2,
)};

const speciesNames: Record<Gen4IvDataLanguage, readonly string[]> = ${JSON.stringify(species, null, 2)};

const formNames: Record<Gen4IvDataLanguage, Readonly<Record<number, readonly string[]>>> = ${JSON.stringify(forms, null, 2)};

const characteristicNames: Record<Gen4IvDataLanguage, readonly string[]> = ${JSON.stringify(characteristics, null, 2)};

const abilityNames: Record<Gen4IvDataLanguage, readonly string[]> = ${JSON.stringify(abilities, null, 2)};

const decodedPersonal: Partial<Record<Gen4PersonalVersion, Uint8Array>> = {};
const formData: Readonly<Record<number, { count: number; index: number }>> = {
  386: { count: 4, index: 496 },
  413: { count: 3, index: 499 },
  479: { count: 6, index: 503 },
  487: { count: 2, index: 501 },
  492: { count: 2, index: 502 },
};

function languageKey(language: string): Gen4IvDataLanguage {
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("ja")) return "ja";
  return "en";
}

function personal(dataSet: Gen4PersonalVersion) {
  return (decodedPersonal[dataSet] ??= Uint8Array.from(
    atob(encodedPersonal[dataSet]),
    (character) => character.charCodeAt(0),
  ));
}

export function getGen4FormCount(species: number) {
  return formData[species]?.count ?? 1;
}

export function getGen4BaseStats(
  dataSet: Gen4PersonalVersion,
  species: number,
  form = 0,
): Gen4BaseStats {
  if (!Number.isInteger(species) || species < 1 || species > 493) {
    throw new RangeError("Generation IV species must be between 1 and 493.");
  }
  const formInfo = formData[species];
  if (!Number.isInteger(form) || form < 0 || form >= (formInfo?.count ?? 1)) {
    throw new RangeError("Invalid Generation IV form.");
  }
  const record = form === 0 ? species : formInfo.index + form - 1;
  const bytes = personal(dataSet);
  const offset = record * 8;
  if (offset + 8 > bytes.length) {
    throw new RangeError("Generation IV form is unavailable in this game.");
  }
  return [
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
    bytes[offset + 4],
    bytes[offset + 5],
  ];
}

export function getGen4Abilities(
  dataSet: Gen4PersonalVersion,
  species: number,
  form = 0,
): [number, number] {
  const formInfo = formData[species];
  const record = form === 0 ? species : formInfo.index + form - 1;
  const bytes = personal(dataSet);
  const offset = record * 8;
  return [bytes[offset + 6], bytes[offset + 7]];
}

export function getGen4Species(language: string) {
  return speciesNames[languageKey(language)].map((name, index) => ({
    id: index + 1,
    name,
  }));
}

export function getGen4Characteristics(language: string) {
  return characteristicNames[languageKey(language)];
}

export function getGen4AbilityName(language: string, ability: number) {
  return abilityNames[languageKey(language)][ability - 1] ?? String(ability);
}

export function getGen4SpeciesName(
  language: string,
  species: number,
  form = 0,
) {
  const selectedLanguage = languageKey(language);
  const speciesName = speciesNames[selectedLanguage][species - 1] ?? \`#\${species}\`;
  if (form === 0) return speciesName;
  const formName = formNames[selectedLanguage][species]?.[form] ?? String(form);
  return \`\${speciesName} (\${formName})\`;
}
`;

await writeFile(output, source, "utf8");
