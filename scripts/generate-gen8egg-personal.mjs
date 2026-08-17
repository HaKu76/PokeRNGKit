import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const source =
  process.env.POKEFINDER_ROOT ??
  "C:\\Users\\Hakuhiro\\Desktop\\project\\PokeFinder-master";
const input = path.join(
  source,
  "Core",
  "Resources",
  "Personal",
  "Gen8",
  "personal_bdsp.bin",
);
const output = path.join(
  projectRoot,
  "wasm",
  "modules",
  "gen8egg",
  "bridge",
  "personal_data.inc",
);

const recordSize = 0x44;
const speciesCount = 494;
const data = await readFile(input);
if (data.length % recordSize !== 0 || data.length < speciesCount * recordSize) {
  throw new Error(`Unexpected BDSP personal data length: ${data.length}`);
}

const compact = Buffer.alloc(speciesCount * 13);
for (let species = 0; species < speciesCount; species += 1) {
  const sourceOffset = species * recordSize;
  const targetOffset = species * 13;
  const statOffsets = [0, 1, 2, 4, 5, 3];
  statOffsets.forEach((offset, index) => {
    compact[targetOffset + index] = data[sourceOffset + offset];
  });
  compact[targetOffset + 6] = data[sourceOffset + 0x12];
  for (let ability = 0; ability < 3; ability += 1) {
    const value = data.readUInt16LE(sourceOffset + 0x18 + ability * 2);
    compact.writeUInt16LE(value, targetOffset + 7 + ability * 2);
  }
}

const encoded = compact.toString("base64");
const lines = encoded.match(/.{1,100}/g) ?? [];
const generated = [
  "// Generated from PokeFinder 4.3.2 personal_bdsp.bin.",
  "// Records 0..493: six base stats, gender ratio, three uint16 ability IDs.",
  "constexpr std::string_view gen8EggPersonalBase64 =",
  ...lines.map((line, index) =>
    index === lines.length - 1 ? `    "${line}";` : `    "${line}"`,
  ),
  "",
].join("\n");

await writeFile(output, generated, "utf8");
