/// <reference lib="webworker" />

import {
  GEN3_WILD_API_VERSION,
  isRseVersion,
  packGen3WildSlots,
  wildAbilityFilterToWasm,
  wildEncounterToWasm,
  wildGenderFilterToWasm,
  isGen3WildTanobyChamber,
  wildItemToWasm,
  wildLeadToWasm,
  wildMethodToWasm,
  wildSearcherLeadToWasm,
  wildShinyFilterToWasm,
} from "../domain";
import type { Gen3WildWorkerRequest, Gen3WildWorkerResponse } from "./messages";

interface Gen3WildEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen3wild_api_version(): number;
  _gen3wild_generate(
    slots: number,
    slotCount: number,
    seed: number,
    initialAdvances: number,
    maxAdvances: number,
    offset: number,
    method: number,
    lead: number,
    encounter: number,
    rate: number,
    rse: number,
    feebasTile: number,
    feebasLocation: number,
    safariZone: number,
    tanobyChamber: number,
    bike: number,
    item: number,
    tid: number,
    sid: number,
    shinyFilter: number,
    genderFilter: number,
    abilityFilter: number,
    natureMask: number,
    hiddenPowerMask: number,
    encounterSlotMask: number,
    levelMin: number,
    levelMax: number,
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
  _gen3wild_search(
    slots: number,
    slotCount: number,
    startIndex: number,
    stateCount: number,
    method: number,
    lead: number,
    encounter: number,
    rate: number,
    rse: number,
    feebasTile: number,
    feebasLocation: number,
    safariZone: number,
    tanobyChamber: number,
    bike: number,
    item: number,
    tid: number,
    sid: number,
    shinyFilter: number,
    genderFilter: number,
    abilityFilter: number,
    natureMask: number,
    hiddenPowerMask: number,
    encounterSlotMask: number,
    levelMin: number,
    levelMax: number,
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
  _gen3wild_result_ptr(): number;
  _gen3wild_result_count(): number;
  _gen3wild_last_error(): number;
}

type Gen3WildModuleFactory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3WildEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3WildEmscriptenModule | undefined;

function post(message: Gen3WildWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Gen3WildModuleFactory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen3 wild Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3wild_api_version();
  if (apiVersion !== GEN3_WILD_API_VERSION)
    throw new Error(
      `Gen3 wild Wasm API ${apiVersion} does not match UI API ${GEN3_WILD_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3WildWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 wild Wasm module is not initialized.");
  const packedSlots = packGen3WildSlots(message.request.area.slots);
  const pointer = wasm._malloc(packedSlots.byteLength);
  const startedAt = performance.now();
  try {
    wasm.HEAPU32.set(packedSlots, pointer >>> 2);
    const request = message.request;
    const resultCount = wasm._gen3wild_generate(
      pointer,
      request.area.slots.length,
      request.seed,
      message.chunk.initialAdvances,
      message.chunk.maxAdvances,
      request.offset,
      wildMethodToWasm(request.method),
      wildLeadToWasm(request.lead, request.synchronizeNature),
      wildEncounterToWasm(request.area.encounter),
      request.area.rate,
      isRseVersion(request.version) ? 1 : 0,
      request.feebasTile ? 1 : 0,
      request.area.feebasLocation ? 1 : 0,
      request.area.safariZone ? 1 : 0,
      isGen3WildTanobyChamber(request.area.name) ? 1 : 0,
      request.bike ? 1 : 0,
      wildItemToWasm(request.item),
      request.tid,
      request.sid,
      wildShinyFilterToWasm(request.filters.shiny),
      wildGenderFilterToWasm(request.filters.gender),
      wildAbilityFilterToWasm(request.filters.ability),
      request.filters.natureMask,
      request.filters.hiddenPowerMask,
      request.filters.encounterSlotMask,
      request.filters.levelMin,
      request.filters.levelMax,
      ...request.filters.ivMin,
      ...request.filters.ivMax,
    );
    const errorCode = wasm._gen3wild_last_error();
    if (errorCode !== 0)
      throw new Error(`Gen3 wild Wasm core returned error ${errorCode}.`);
    if (resultCount !== wasm._gen3wild_result_count())
      throw new Error("Gen3 wild Wasm result count changed before copy.");
    const resultPointer = wasm._gen3wild_result_ptr() >>> 2;
    const words = wasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultCount * 15,
    );
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
  } finally {
    wasm._free(pointer);
  }
}

function search(message: Extract<Gen3WildWorkerRequest, { type: "search" }>) {
  if (!wasm) throw new Error("Gen3 wild Wasm module is not initialized.");
  const packedSlots = packGen3WildSlots(message.request.area.slots);
  const pointer = wasm._malloc(packedSlots.byteLength);
  const startedAt = performance.now();
  try {
    wasm.HEAPU32.set(packedSlots, pointer >>> 2);
    const request = message.request;
    const resultCount = wasm._gen3wild_search(
      pointer,
      request.area.slots.length,
      message.chunk.startIndex,
      message.chunk.stateCount,
      wildMethodToWasm(request.method),
      wildSearcherLeadToWasm(request.lead),
      wildEncounterToWasm(request.area.encounter),
      request.area.rate,
      isRseVersion(request.version) ? 1 : 0,
      request.feebasTile ? 1 : 0,
      request.area.feebasLocation ? 1 : 0,
      request.area.safariZone ? 1 : 0,
      isGen3WildTanobyChamber(request.area.name) ? 1 : 0,
      request.bike ? 1 : 0,
      wildItemToWasm(request.item),
      request.tid,
      request.sid,
      wildShinyFilterToWasm(request.filters.shiny),
      wildGenderFilterToWasm(request.filters.gender),
      wildAbilityFilterToWasm(request.filters.ability),
      request.filters.natureMask,
      request.filters.hiddenPowerMask,
      request.filters.encounterSlotMask,
      request.filters.levelMin,
      request.filters.levelMax,
      ...request.filters.ivMin,
      ...request.filters.ivMax,
    );
    const errorCode = wasm._gen3wild_last_error();
    if (errorCode !== 0)
      throw new Error(`Gen3 wild Wasm core returned error ${errorCode}.`);
    if (resultCount !== wasm._gen3wild_result_count())
      throw new Error("Gen3 wild Wasm result count changed before copy.");
    const resultPointer = wasm._gen3wild_result_ptr() >>> 2;
    const words = wasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultCount * 15,
    );
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
  } finally {
    wasm._free(pointer);
  }
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3WildWorkerRequest>) => {
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
