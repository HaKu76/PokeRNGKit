import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const prettierCli = fileURLToPath(
  new URL("../node_modules/prettier/bin/prettier.cjs", import.meta.url),
);

function gitFiles(args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "buffer",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

const files = [
  ...new Set([
    ...gitFiles(["diff", "--name-only", "-z", "--diff-filter=ACMR", "HEAD"]),
    ...gitFiles(["ls-files", "--others", "--exclude-standard", "-z"]),
  ]),
];

if (files.length === 0) {
  console.log("No changed files to format.");
  process.exit(0);
}

function runPrettier(args) {
  const result = spawnSync(process.execPath, [prettierCli, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (let index = 0; index < files.length; index += 100) {
  const batch = files.slice(index, index + 100);
  runPrettier(["--write", "--ignore-unknown", "--", ...batch]);
  runPrettier(["--check", "--ignore-unknown", "--", ...batch]);
}
