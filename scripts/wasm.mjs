import { access, readFile } from "node:fs/promises";
import { chmodSync, constants, existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const wasmRoot = path.join(projectRoot, "wasm");
const outputRoot = path.join(projectRoot, "public", "wasm");
const buildRoot = path.join(wasmRoot, "build");
const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);

function runtimeCommand(packageName, executableName) {
  let command;
  try {
    command = require(packageName)(executableName);
  } catch {
    return executableName;
  }

  if (process.platform !== "win32") {
    const mode = statSync(command).mode & 0o777;
    if ((mode & 0o111) === 0) {
      chmodSync(command, mode | 0o111);
    }
  }

  return command;
}

const cmakeCommand = runtimeCommand("cmake-runtime", "cmake");
const ctestCommand = runtimeCommand("cmake-runtime", "ctest");
const ninjaCommand = runtimeCommand("ninja-runtime", "ninja");

function executable(name) {
  return process.platform === "win32" ? `${name}.exe` : name;
}

function usesShell(command) {
  return process.platform === "win32" && command.endsWith(".bat");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: usesShell(command),
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} exited with code ${result.status ?? "unknown"}`,
    );
  }
}

function probe(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: usesShell(command),
    stdio: "ignore",
  });
  return !result.error && result.status === 0;
}

function windowsVsDevCmd() {
  if (process.platform !== "win32" || process.env.VSCMD_VER) return;
  const vswhere = path.join(
    process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)",
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );
  if (!existsSync(vswhere)) return;
  const result = spawnSync(
    vswhere,
    [
      "-latest",
      "-products",
      "*",
      "-requires",
      "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
      "-property",
      "installationPath",
    ],
    { encoding: "utf8" },
  );
  const installationPath = result.stdout?.trim();
  if (!installationPath) return;
  const devCommand = path.join(
    installationPath,
    "Common7",
    "Tools",
    "VsDevCmd.bat",
  );
  return existsSync(devCommand) ? devCommand : undefined;
}

function runNativeTestsInWindowsDevEnvironment() {
  const devCommand = windowsVsDevCmd();
  if (!devCommand) return false;
  process.stdout.write(
    "Activating the Visual Studio x64 developer environment.\n",
  );
  run("cmd.exe", [
    "/d",
    "/c",
    "call",
    devCommand,
    "-arch=x64",
    "-host_arch=x64",
    "&&",
    process.execPath,
    scriptPath,
    "test-native",
  ]);
  return true;
}

async function loadModules() {
  const moduleNames = (
    process.env.POKERNGKIT_WASM_MODULES ??
    "gen3id,gen3initialseed,gen3seedtotime,gen3ngcseed,gen3static,gen3wild,gen3ivtopid,gen3pidtoiv,gen3egg,gen3gamecube,gen3pokespot,gen3jirachi,gen4id,gen4seedtotime,gen4static,gen4wild,gen4egg,gen4event,gen4chainedsid,gen4advance,gen5profiles,gen5id,gen5adjacentseeds,gen5ivcache,gen5sha1cache,gen5dreamradar,gen5static,gen5wild,gen5hiddengrotto,gen5egg,gen5event,gen6stationary,gen7stationary,gen7wild,gen7sos,gen7egg,gen7battletree,gen7event,gen7main,gen7eggseedfinder,gen7festivalplaza,gen7id,gen8id,gen8egg,gen8event,gen8raids,gen8static,gen8underground,gen8wild,pokerusfinder,researcher"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return Promise.all(
    moduleNames.map(async (moduleName) => {
      const manifestPath = path.join(
        wasmRoot,
        "modules",
        moduleName,
        "module.json",
      );
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      return { ...manifest, manifestPath };
    }),
  );
}

async function doctor() {
  const checks = [
    ["Node.js", process.execPath, ["--version"]],
    ["CMake", cmakeCommand, ["--version"]],
    ["Ninja", ninjaCommand, ["--version"]],
    ["Emscripten", executable("emcc"), ["--version"]],
    [
      "emcmake",
      executable("emcmake"),
      [
        cmakeCommand,
        "-G",
        "Ninja",
        `-DCMAKE_MAKE_PROGRAM=${ninjaCommand}`,
        "--version",
      ],
    ],
  ];

  const missing = [];
  for (const [label, command, args] of checks) {
    const available = probe(command, args);
    process.stdout.write(`${available ? "ok" : "missing"}  ${label}\n`);
    if (!available) missing.push(label);
  }

  if (missing.length > 0) {
    throw new Error(
      `Wasm toolchain is incomplete: ${missing.join(", ")}. CMake and Ninja are npm dependencies; Emscripten 6.0.6 must be activated through emsdk.`,
    );
  }
}

async function configureWasm(modules) {
  const moduleList = modules.map(({ id }) => id).join(";");
  run(executable("emcmake"), [
    cmakeCommand,
    "-S",
    wasmRoot,
    "-B",
    path.join(buildRoot, "wasm-release"),
    "-G",
    "Ninja",
    `-DCMAKE_MAKE_PROGRAM=${ninjaCommand}`,
    "-DCMAKE_BUILD_TYPE=Release",
    `-DPOKERNGKIT_WASM_MODULES=${moduleList}`,
    `-DPOKERNGKIT_WASM_OUTPUT_DIR=${outputRoot}`,
  ]);
}

async function verifyArtifacts(modules) {
  for (const module of modules) {
    const artifacts = Array.isArray(module.artifacts)
      ? module.artifacts
      : Object.values(module.artifacts);
    for (const artifact of artifacts) {
      await access(path.join(outputRoot, artifact), constants.R_OK);
    }
  }
}

async function buildWasm(modules) {
  await configureWasm(modules);
  run(cmakeCommand, [
    "--build",
    path.join(buildRoot, "wasm-release"),
    "--config",
    "Release",
    "--parallel",
    "--target",
    ...modules.map(({ target }) => target),
  ]);
  await verifyArtifacts(modules);
}

async function testNative(modules) {
  const nativeBuild = path.join(buildRoot, "native-debug");
  const moduleList = modules.map(({ id }) => id).join(";");
  run(cmakeCommand, [
    "-S",
    wasmRoot,
    "-B",
    nativeBuild,
    "-G",
    "Ninja",
    `-DCMAKE_MAKE_PROGRAM=${ninjaCommand}`,
    "-DCMAKE_BUILD_TYPE=Debug",
    "-DBUILD_TESTING=ON",
    `-DPOKERNGKIT_WASM_MODULES=${moduleList}`,
  ]);
  run(cmakeCommand, [
    "--build",
    nativeBuild,
    "--config",
    "Debug",
    "--parallel",
  ]);
  run(ctestCommand, [
    "--test-dir",
    nativeBuild,
    "--build-config",
    "Debug",
    "--output-on-failure",
  ]);
}

const command = process.argv[2] ?? "build";
const modules = await loadModules();

switch (command) {
  case "doctor":
    await doctor();
    break;
  case "configure":
    await doctor();
    await configureWasm(modules);
    break;
  case "build":
    await doctor();
    await buildWasm(modules);
    break;
  case "test-native":
    if (!probe(cmakeCommand) || !probe(ninjaCommand)) {
      throw new Error("Native tests require CMake and Ninja.");
    }
    if (runNativeTestsInWindowsDevEnvironment()) break;
    await testNative(modules);
    break;
  default:
    throw new Error(`Unknown Wasm command: ${command}`);
}
