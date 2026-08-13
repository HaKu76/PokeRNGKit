import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error(
    "Usage: node scripts/generate-gen3-gamecube-data.mjs <encounters.json>",
  );
}

const source = JSON.parse(await readFile(path.resolve(sourcePath), "utf8"));
const output = {
  nonShadow: source.galesColo,
  shadow: source.galesColoShadow,
  channel: source.channel,
};

await writeFile(
  path.resolve("src/features/gamecube/encounters.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);
