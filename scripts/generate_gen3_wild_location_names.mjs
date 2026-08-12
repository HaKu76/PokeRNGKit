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

function normalize(name) {
  return name
    .toLowerCase()
    .replace(/pokemon/g, "poke")
    .replace(/[^a-z0-9]/g, "");
}

function parseResource(text) {
  return new Map(
    text
      .trim()
      .split(/\r?\n/)
      .flatMap((line) => {
        const separator = line.indexOf(",");
        if (separator < 0) return [];
        return [[Number(line.slice(0, separator)), line.slice(separator + 1)]];
      }),
  );
}

function findResourceName(name, entries) {
  const normalized = normalize(name);
  const exact = entries.find((entry) => normalize(entry.en) === normalized);
  if (exact) return exact;

  const prefixes = entries
    .filter((entry) => {
      const candidate = normalize(entry.en);
      return candidate.startsWith(normalized) || normalized.startsWith(candidate);
    })
    .sort((left, right) => normalize(right.en).length - normalize(left.en).length);
  return prefixes[0];
}

const dataPath = path.resolve(option("--data"));
const resourceRoot = path.resolve(option("--resources"));
const outputPath = path.resolve(option("--output"));
const data = await readFile(dataPath, "utf8");
const names = [...new Set([...data.matchAll(/name:`([^`]+)`/g)].map((match) => match[1]))].sort();
const resourceFiles = ["rs", "e", "frlg"];
const resourceEntries = [];

for (const resourceFile of resourceFiles) {
  const [english, chinese] = await Promise.all([
    readFile(path.join(resourceRoot, "en", `${resourceFile}_en.txt`), "utf8"),
    readFile(path.join(resourceRoot, "zh", `${resourceFile}_zh.txt`), "utf8"),
  ]);
  const englishById = parseResource(english);
  const chineseById = parseResource(chinese);
  for (const [id, englishName] of englishById) {
    const chineseName = chineseById.get(id);
    if (chineseName) resourceEntries.push({ en: englishName, zh: chineseName });
  }
}

const labels = Object.fromEntries(
  names.flatMap((name) => {
    const matched = findResourceName(name, resourceEntries);
    return matched ? [[name, { en: matched.en, zh: matched.zh }]] : [];
  }),
);
const header = [
  "/*!",
  " * Generated from PokeFinder 4.3.2 Core/Resources/i18n/{en,zh}/{rs,e,frlg}_*.txt.",
  " * GPL-3.0-or-later. Do not hand-edit; rerun scripts/generate_gen3_wild_location_names.mjs.",
  " */",
  "",
].join("\n");
const body = `export interface Gen3WildLocationNames {\n  readonly en: string;\n  readonly zh: string;\n}\n\nexport const GEN3_WILD_LOCATION_NAMES: Readonly<Record<string, Gen3WildLocationNames>> = ${JSON.stringify(labels, null, 2)} as const;\n\nexport function getGen3WildLocationName(language: string, name: string): string {\n  const labels = GEN3_WILD_LOCATION_NAMES[name];\n  if (!labels) return name;\n  return language === \"zh\" ? labels.zh : labels.en;\n}\n`;

await writeFile(outputPath, header + body, "utf8");
