/// <reference lib="webworker" />

import {
  GEN3_STATIC_API_VERSION,
  staticAbilityFilterToWasm,
  staticGenderFilterToWasm,
  staticMethodToWasm,
  staticShinyFilterToWasm,
} from "../domain";
import type {
  Gen3StaticWorkerRequest,
  Gen3StaticWorkerResponse,
} from "./messages";

interface Gen3StaticEmscriptenModule {
  HEAPU32: Uint32Array;
  _gen3static_api_version(): number;
  _gen3static_generate(
    seed: number,
    initialAdvances: number,
    maxAdvances: number,
    offset: number,
    method: number,
    species: number,
    level: number,
    genderRatio: number,
    buggedRoamer: number,
    tid: number,
    sid: number,
    shinyFilter: number,
    genderFilter: number,
    abilityFilter: number,
    natureFilter: number,
    hpMin: number,
    attackMin: number,
    defenseMin: number,
    specialAttackMin: number,
    specialDefenseMin: number,
    speedMin: number,
    hpMax: number,
    attackMax: number,
    defenseMax: number,
    specialAttackMax: number,
    specialDefenseMax: number,
    speedMax: number,
  ): number;
  _gen3static_search(
    startIndex: number,
    stateCount: number,
    method: number,
    species: number,
    level: number,
    genderRatio: number,
    buggedRoamer: number,
    tid: number,
    sid: number,
    shinyFilter: number,
    genderFilter: number,
    abilityFilter: number,
    natureFilter: number,
    hpMin: number,
    attackMin: number,
    defenseMin: number,
    specialAttackMin: number,
    specialDefenseMin: number,
    speedMin: number,
    hpMax: number,
    attackMax: number,
    defenseMax: number,
    specialAttackMax: number,
    specialDefenseMax: number,
    speedMax: number,
  ): number;
  _gen3static_result_ptr(): number;
  _gen3static_result_count(): number;
  _gen3static_last_error(): number;
}

type Gen3StaticModuleFactory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3StaticEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3StaticEmscriptenModule | undefined;

function post(
  message: Gen3StaticWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Gen3StaticModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen3 static Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3static_api_version();
  if (apiVersion !== GEN3_STATIC_API_VERSION) {
    throw new Error(
      `Gen3 static Wasm API ${apiVersion} does not match UI API ${GEN3_STATIC_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3StaticWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 static Wasm module is not initialized.");
  const { request } = message;
  const { filters, template } = request;
  const startedAt = performance.now();
  const resultCount = wasm._gen3static_generate(
    request.seed,
    message.chunk.initialAdvances,
    message.chunk.maxAdvances,
    request.offset,
    staticMethodToWasm(request.method),
    template.species,
    template.level,
    template.genderRatio,
    template.buggedRoamer ? 1 : 0,
    request.tid,
    request.sid,
    staticShinyFilterToWasm(filters.shiny),
    staticGenderFilterToWasm(filters.gender),
    staticAbilityFilterToWasm(filters.ability),
    filters.nature < 0 ? 25 : filters.nature,
    ...filters.ivMin,
    ...filters.ivMax,
  );
  const errorCode = wasm._gen3static_last_error();
  if (errorCode !== 0)
    throw new Error(`Gen3 static Wasm core returned error ${errorCode}.`);
  if (resultCount !== wasm._gen3static_result_count()) {
    throw new Error(
      "Gen3 static Wasm result count changed before the buffer was copied.",
    );
  }
  const pointer = wasm._gen3static_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultCount * 12);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

function search(message: Extract<Gen3StaticWorkerRequest, { type: "search" }>) {
  if (!wasm) throw new Error("Gen3 static Wasm module is not initialized.");
  const { request } = message;
  const { filters, template } = request;
  const startedAt = performance.now();
  const resultCount = wasm._gen3static_search(
    message.chunk.startIndex,
    message.chunk.stateCount,
    staticMethodToWasm(request.method),
    template.species,
    template.level,
    template.genderRatio,
    template.buggedRoamer ? 1 : 0,
    request.tid,
    request.sid,
    staticShinyFilterToWasm(filters.shiny),
    staticGenderFilterToWasm(filters.gender),
    staticAbilityFilterToWasm(filters.ability),
    filters.nature < 0 ? 25 : filters.nature,
    ...filters.ivMin,
    ...filters.ivMax,
  );
  const errorCode = wasm._gen3static_last_error();
  if (errorCode !== 0)
    throw new Error(`Gen3 static Wasm core returned error ${errorCode}.`);
  if (resultCount !== wasm._gen3static_result_count()) {
    throw new Error(
      "Gen3 static Wasm result count changed before the buffer was copied.",
    );
  }
  const pointer = wasm._gen3static_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultCount * 12);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3StaticWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else if (data.type === "run") run(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      chunkIndex: data.type === "init" ? undefined : data.chunk.index,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
