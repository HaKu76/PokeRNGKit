import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
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

function runtimeCommand(packageName, executableName) {
  try {
    return require(packageName)(executableName);
  } catch {
    return executableName;
  }
}

const cmakeCommand = runtimeCommand("cmake-runtime", "cmake");
const ctestCommand = runtimeCommand("cmake-runtime", "ctest");
const ninjaCommand = runtimeCommand("ninja-runtime", "ninja");

function executable(name) {
  return process.platform === "win32" ? `${name}.bat` : name;
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

async function loadModules() {
  const moduleNames = (process.env.POKERNGKIT_WASM_MODULES ?? "gen3id")
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
    ["emcmake", executable("emcmake"), ["--version"]],
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
    for (const artifact of module.artifacts) {
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
    await testNative(modules);
    break;
  default:
    throw new Error(`Unknown Wasm command: ${command}`);
}
