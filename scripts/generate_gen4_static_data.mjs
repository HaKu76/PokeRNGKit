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

const versionMap = {
  "Game::Diamond": ["diamond"],
  "Game::Pearl": ["pearl"],
  "Game::DP": ["diamond", "pearl"],
  "Game::Platinum": ["platinum"],
  "Game::DPPt": ["diamond", "pearl", "platinum"],
  "Game::HeartGold": ["heartgold"],
  "Game::SoulSilver": ["soulsilver"],
  "Game::HGSS": ["heartgold", "soulsilver"],
  "Game::Gen4": ["diamond", "pearl", "platinum", "heartgold", "soulsilver"],
};
const methodMap = {
  "Method::Method1": "method1",
  "Method::MethodJ": "methodJ",
  "Method::MethodK": "methodK",
};
const shinyMap = {
  "Shiny::Random": "random",
  "Shiny::Never": "never",
  "Shiny::Always": "always",
};

function genderRatio(personal, species) {
  const offset = species * 0x2c + 0x10;
  if (offset >= personal.length) {
    throw new Error(`Missing Gen IV personal record for species ${species}.`);
  }
  return personal[offset];
}

const encountersPath = path.resolve(option("--encounters"));
const personalPath = path.resolve(option("--personal"));
const outputPath = path.resolve(option("--output"));
const [encountersText, personal] = await Promise.all([
  readFile(encountersPath, "utf8"),
  readFile(personalPath),
]);
const encounters = JSON.parse(encountersText);
const categories = [
  "starters",
  "fossils",
  "gifts",
  "gameCorner",
  "stationary",
  "legends",
  "events",
  "roamers",
];
const templates = categories.flatMap((category) =>
  encounters[category].map((entry, index) => {
    const versions = versionMap[entry.version];
    const method = methodMap[entry.method];
    if (!versions || !method) {
      throw new Error(
        `Unsupported Gen IV encounter mapping: ${entry.version} / ${entry.method}`,
      );
    }
    return {
      id: `${category}-${String(index).padStart(2, "0")}`,
      category,
      label: entry.description.trim(),
      versions,
      species: entry.specie,
      form: entry.form ?? 0,
      level: entry.level,
      genderRatio: genderRatio(personal, entry.specie),
      method,
      shinyLock: shinyMap[entry.shiny ?? "Shiny::Random"],
    };
  }),
);

const source = `/*!
 * Generated from EncounterTableGenerator Gen4/encounters.json and
 * PokeFinder 4.3.2 personal_pt.bin. GPL-3.0-or-later.
 * Do not hand-edit; rerun scripts/generate_gen4_static_data.mjs.
 */
import type { Gen4StaticTemplate } from "./domain";

export const GEN4_STATIC_TEMPLATES: readonly Gen4StaticTemplate[] = ${JSON.stringify(templates, null, 2)};
`;

await writeFile(outputPath, source, "utf8");
