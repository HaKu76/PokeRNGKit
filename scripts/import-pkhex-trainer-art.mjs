// Import unmodified trainer sprite PNGs from the owner-provided PKHeX 26.08.26 source.
// Run: node scripts/import-pkhex-trainer-art.mjs <PKHeX-master directory>
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import console from "node:console";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

if (!process.argv[2])
  throw new Error("Provide the PKHeX 26.08.26 source directory.");
const source = path.resolve(process.argv[2]);
const root = fileURLToPath(new URL("../", import.meta.url));
const resx = path.join(source, "PKHeX.Drawing.Misc/Properties/Resources.resx");
const xml = await readFile(resx, "utf8");
const mappingPath = path.join(
  root,
  "src/features/saveeditor/art-manifest.json",
);
const hashesPath = path.join(root, "third_party/pkhex/art-manifest.json");
const mapping = JSON.parse(await readFile(mappingPath, "utf8"));
const hashes = JSON.parse(await readFile(hashesPath, "utf8"));
const entries = [];
// The upstream ResX file uses file references; only accept its trainer PNG keys.
for (const match of xml.matchAll(
  /<data name="(tr_\d+)"[^>]*>\s*<value>([^<]+)<\/value>/g,
)) {
  const key = match[1];
  const file = path.resolve(
    path.dirname(resx),
    match[2].split(";")[0].replaceAll("\\", "/"),
  );
  const relative = path.relative(source, file).replaceAll("\\", "/");
  if (
    relative.startsWith("../") ||
    path.isAbsolute(relative) ||
    !relative.endsWith(".png")
  )
    throw new Error(`Invalid resource reference: ${key}`);
  const bytes = await readFile(file);
  if (
    !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error(`Not a PNG: ${relative}`);
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hashes.files[relative] && hashes.files[relative] !== hash)
    throw new Error(`Existing source hash differs: ${relative}`);
  entries.push({ key, relative, bytes, hash });
}
for (const required of ["tr_00", "tr_01", "tr_37", "tr_73"])
  if (!entries.some((e) => e.key === required))
    throw new Error(`Missing ${required}`);
const output = path.join(root, "public/save-art/26.08.26");
await mkdir(output, { recursive: true });
for (const { key, relative, bytes, hash } of entries) {
  const filename = `${key}.png`;
  await writeFile(path.join(output, filename), bytes);
  mapping[key] = filename;
  hashes.files[relative] = hash;
}
await writeFile(mappingPath, JSON.stringify(mapping, null, 2) + "\n");
await writeFile(hashesPath, JSON.stringify(hashes, null, 2) + "\n");
console.log(
  `Imported ${entries.length} unmodified trainer images (${entries.reduce((n, e) => n + e.bytes.length, 0)} bytes).`,
);
