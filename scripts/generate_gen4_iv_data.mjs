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
    if (species > 898 || !Number.isInteger(form)) continue;
    forms[species] ??= [];
    forms[species][form] = nameParts.join(",");
  }
  return forms;
}

function parseCharacteristics(text, generation) {
  return JSON.parse(text).map((entry) => {
    const match = Object.entries(entry).find(([, generations]) =>
      generations.includes(generation),
    );
    if (!match)
      throw new Error(`Missing Generation ${generation} characteristic.`);
    return match[0];
  });
}

function compactPersonal(buffer, layout) {
  if (buffer.length % layout.recordSize !== 0) {
    throw new Error(
      `Invalid PokeFinder personal data length for ${layout.name}.`,
    );
  }
  const recordCount = buffer.length / layout.recordSize;
  const compact = Buffer.alloc(recordCount * 14);
  for (let record = 0; record < recordCount; record++) {
    const source = record * layout.recordSize;
    const target = record * 14;
    compact[target] = buffer[source];
    compact[target + 1] = buffer[source + 1];
    compact[target + 2] = buffer[source + 2];
    compact[target + 3] = buffer[source + 4];
    compact[target + 4] = buffer[source + 5];
    compact[target + 5] = buffer[source + 3];

    const form = layout.form(buffer, source, record);
    compact[target + 6] = form.count;
    compact.writeUInt16LE(form.index, target + 7);
    compact[target + 9] = layout.present(buffer, source) ? 1 : 0;

    const [ability1, ability2] = layout.abilities(buffer, source);
    compact.writeUInt16LE(ability1, target + 10);
    compact.writeUInt16LE(ability2 || ability1, target + 12);
  }
  return compact.toString("base64");
}

function fixedGen3Form(_buffer, _source, record) {
  return record >= 386 && record <= 389
    ? { count: 4, index: 387 }
    : { count: 1, index: 0 };
}

function fixedGen4Form(_buffer, _source, record) {
  if ([386, 496, 497, 498].includes(record)) return { count: 4, index: 496 };
  if ([413, 499, 500].includes(record)) return { count: 3, index: 499 };
  if ([487, 501].includes(record)) return { count: 2, index: 501 };
  if ([492, 502].includes(record)) return { count: 2, index: 502 };
  if ([479, 503, 504, 505, 506, 507].includes(record)) {
    return { count: 6, index: 503 };
  }
  return { count: 1, index: 0 };
}

const root = path.resolve(option("--pokerfinder-root"));
const output = path.resolve(option("--output"));
const resourceRoot = path.join(root, "Core", "Resources");
const personalRoot = path.join(resourceRoot, "Personal");
const i18nRoot = path.join(resourceRoot, "i18n");
const languages = ["en", "ja", "zh"];
const alwaysPresent = () => true;
const byteAbilities = (first, second) => (buffer, source) => [
  buffer[source + first],
  buffer[source + second],
];
const wordAbilities = (buffer, source) => [
  buffer.readUInt16LE(source + 0x18),
  buffer.readUInt16LE(source + 0x1a),
];
const embeddedForm = (indexOffset) => (buffer, source) => ({
  count: buffer[source + 0x20],
  index: buffer.readUInt16LE(source + indexOffset),
});
const layouts = {
  gen3: {
    name: "Gen III",
    path: ["Gen3", "personal_rsefrlg.bin"],
    recordSize: 0x1c,
    form: fixedGen3Form,
    present: alwaysPresent,
    abilities: byteAbilities(0x16, 0x17),
  },
  diamond: {
    name: "Diamond",
    path: ["Gen4", "personal_d.bin"],
    recordSize: 0x2c,
    form: fixedGen4Form,
    present: alwaysPresent,
    abilities: byteAbilities(0x16, 0x17),
  },
  pearl: {
    name: "Pearl",
    path: ["Gen4", "personal_p.bin"],
    recordSize: 0x2c,
    form: fixedGen4Form,
    present: alwaysPresent,
    abilities: byteAbilities(0x16, 0x17),
  },
  platinum: {
    name: "Platinum",
    path: ["Gen4", "personal_pt.bin"],
    recordSize: 0x2c,
    form: fixedGen4Form,
    present: alwaysPresent,
    abilities: byteAbilities(0x16, 0x17),
  },
  hgss: {
    name: "HGSS",
    path: ["Gen4", "personal_hgss.bin"],
    recordSize: 0x2c,
    form: fixedGen4Form,
    present: alwaysPresent,
    abilities: byteAbilities(0x16, 0x17),
  },
  bw2: {
    name: "BW2",
    path: ["Gen5", "personal_b2w2.bin"],
    recordSize: 0x4c,
    form: embeddedForm(0x1c),
    present: alwaysPresent,
    abilities: byteAbilities(0x18, 0x19),
  },
  swsh: {
    name: "SwSh",
    path: ["Gen8", "personal_swsh.bin"],
    recordSize: 0xb0,
    form: embeddedForm(0x1e),
    present: (buffer, source) => ((buffer[source + 0x21] >> 6) & 1) !== 0,
    abilities: wordAbilities,
  },
  bdsp: {
    name: "BDSP",
    path: ["Gen8", "personal_bdsp.bin"],
    recordSize: 0x44,
    form: embeddedForm(0x1e),
    present: (buffer, source) => ((buffer[source + 0x21] >> 6) & 1) !== 0,
    abilities: wordAbilities,
  },
};

const personalEntries = await Promise.all(
  Object.entries(layouts).map(async ([key, layout]) => [
    key,
    compactPersonal(
      await readFile(path.join(personalRoot, ...layout.path)),
      layout,
    ),
  ]),
);
const localizedResources = await Promise.all(
  languages.flatMap((language) => [
    readFile(path.join(i18nRoot, language, `species_${language}.txt`), "utf8"),
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
);

const species = {};
const forms = {};
const characteristics = {};
const abilities = {};
languages.forEach((language, index) => {
  const characteristicSource = localizedResources[index * 4 + 2];
  species[language] = localizedResources[index * 4]
    .trim()
    .split(/\r?\n/)
    .slice(0, 898);
  forms[language] = parseForms(localizedResources[index * 4 + 1]);
  characteristics[language] = {
    gen4: parseCharacteristics(characteristicSource, 4),
    gen5: parseCharacteristics(characteristicSource, 5),
    gen8: parseCharacteristics(characteristicSource, 8),
  };
  abilities[language] = localizedResources[index * 4 + 3].trim().split(/\r?\n/);
});

const source = `/*!
 * Generated from PokeFinder 4.3.2 Personal and i18n resources.
 * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen4_iv_data.mjs.
 */

export type IvCalculatorDataSet = "gen3" | "platinum" | "hgss" | "bw2" | "swsh" | "bdsp";
export type Gen4PersonalDataSet = "platinum" | "hgss";
export type Gen4PersonalVersion = "diamond" | "pearl" | Gen4PersonalDataSet;
type IvPersonalVersion = "gen3" | Gen4PersonalVersion | "bw2" | "swsh" | "bdsp";
export type Gen4IvDataLanguage = "en" | "ja" | "zh";
export type Gen4BaseStats = [number, number, number, number, number, number];

const encodedPersonal: Record<IvPersonalVersion, string> = ${JSON.stringify(Object.fromEntries(personalEntries), null, 2)};
const dataSetMaximum: Record<IvCalculatorDataSet, number> = {
  gen3: 386,
  platinum: 493,
  hgss: 493,
  bw2: 649,
  swsh: 898,
  bdsp: 493,
};
const speciesNames: Record<Gen4IvDataLanguage, readonly string[]> = ${JSON.stringify(species, null, 2)};
const formNames: Record<Gen4IvDataLanguage, Readonly<Record<number, readonly string[]>>> = ${JSON.stringify(forms, null, 2)};
const characteristicNames: Record<Gen4IvDataLanguage, Record<"gen4" | "gen5" | "gen8", readonly string[]>> = ${JSON.stringify(characteristics, null, 2)};
const abilityNames: Record<Gen4IvDataLanguage, readonly string[]> = ${JSON.stringify(abilities, null, 2)};
const decodedPersonal: Partial<Record<IvPersonalVersion, Uint8Array>> = {};
const recordSize = 14;

function languageKey(language: string): Gen4IvDataLanguage {
  if (language.startsWith("zh")) return "zh";
  if (language.startsWith("ja")) return "ja";
  return "en";
}

function personal(dataSet: IvPersonalVersion) {
  return (decodedPersonal[dataSet] ??= Uint8Array.from(
    atob(encodedPersonal[dataSet]),
    (character) => character.charCodeAt(0),
  ));
}

function recordOffset(dataSet: IvPersonalVersion, species: number, form = 0) {
  const bytes = personal(dataSet);
  const baseOffset = species * recordSize;
  const formCount = bytes[baseOffset + 6] || 1;
  const formIndex = bytes[baseOffset + 7] | (bytes[baseOffset + 8] << 8);
  if (!Number.isInteger(form) || form < 0 || form >= formCount) {
    throw new RangeError("Invalid Pokemon form.");
  }
  return (form === 0 || formIndex === 0 ? species : formIndex + form - 1) * recordSize;
}

export function getIvFormCount(dataSet: IvPersonalVersion, species: number) {
  return personal(dataSet)[species * recordSize + 6] || 1;
}

export function getIvBaseStats(dataSet: IvPersonalVersion, species: number, form = 0): Gen4BaseStats {
  const maximum = dataSetMaximum[dataSet as IvCalculatorDataSet] ?? 493;
  if (!Number.isInteger(species) || species < 1 || species > maximum) {
    throw new RangeError(\`Pokemon species must be between 1 and \${maximum}.\`);
  }
  const bytes = personal(dataSet);
  const offset = recordOffset(dataSet, species, form);
  if (offset + recordSize > bytes.length) throw new RangeError("Pokemon form is unavailable in this game.");
  return [bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3], bytes[offset + 4], bytes[offset + 5]];
}

export function getIvSpecies(language: string, dataSet: IvCalculatorDataSet) {
  const bytes = personal(dataSet);
  return speciesNames[languageKey(language)]
    .slice(0, dataSetMaximum[dataSet])
    .map((name, index) => ({ id: index + 1, name }))
    .filter((entry) => bytes[entry.id * recordSize + 9] !== 0);
}

export function getIvCharacteristics(language: string, dataSet: IvCalculatorDataSet) {
  if (dataSet === "gen3") return [];
  const generation = dataSet === "bw2" ? "gen5" : dataSet === "swsh" || dataSet === "bdsp" ? "gen8" : "gen4";
  return characteristicNames[languageKey(language)][generation];
}

export function getIvSpeciesName(language: string, species: number, form = 0) {
  const selectedLanguage = languageKey(language);
  const speciesName = speciesNames[selectedLanguage][species - 1] ?? \`#\${species}\`;
  if (form === 0) return speciesName;
  const formName = formNames[selectedLanguage][species]?.[form] ?? String(form);
  return \`\${speciesName} (\${formName})\`;
}

export function getGen4FormCount(species: number) {
  return getIvFormCount("platinum", species);
}
export function getGen4BaseStats(dataSet: Gen4PersonalVersion, species: number, form = 0) {
  return getIvBaseStats(dataSet, species, form);
}
export function getGen4Abilities(dataSet: Gen4PersonalVersion, species: number, form = 0): [number, number] {
  const bytes = personal(dataSet);
  const offset = recordOffset(dataSet, species, form);
  return [bytes[offset + 10] | (bytes[offset + 11] << 8), bytes[offset + 12] | (bytes[offset + 13] << 8)];
}
export function getGen4Species(language: string) {
  return getIvSpecies(language, "platinum");
}
export function getGen4Characteristics(language: string) {
  return getIvCharacteristics(language, "platinum");
}
export function getGen4AbilityName(language: string, ability: number) {
  return abilityNames[languageKey(language)][ability - 1] ?? String(ability);
}
export const getGen4SpeciesName = getIvSpeciesName;
`;

await writeFile(output, source, "utf8");
