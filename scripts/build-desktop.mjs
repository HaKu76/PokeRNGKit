import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (command, args, env = process.env) => {
  const result = spawnSync(command, args, {
    env,
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (!existsSync("dist/index.html")) {
  run(npmCommand, ["run", "build"], {
    ...process.env,
    BASE_PATH: "./",
  });
}
run(process.execPath, [
  fileURLToPath(
    new URL("../node_modules/electron-builder/cli.js", import.meta.url),
  ),
  "--win",
  "--x64",
  "--publish",
  "never",
]);
