/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_WILD_API_VERSION,
  GEN4_WILD_CHUNK_SIZE,
  GEN4_WILD_MAX_RESULTS,
  GEN4_WILD_SEARCHER_CHUNK_SIZE,
  gen4WildEncounterToWasm,
  gen4WildFilterCode,
  gen4WildLeadToWasm,
  gen4WildMethodToWasm,
  gen4WildSearcherCombinationCount,
  packGen4WildSlots,
  validateGen4WildGeneratorRequest,
  validateGen4WildSearcherRequest,
  type Gen4WildChunk,
  type Gen4WildGeneratorRequest,
  type Gen4WildSearcherChunk,
  type Gen4WildSearcherRequest,
} from "../domain";
import type { Gen4WildWorkerRequest, Gen4WildWorkerResponse } from "./messages";
interface Module {
  HEAPU32: Uint32Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _gen4wild_api_version(): number;
  _gen4wild_generate(p: number): number;
  _gen4wild_search(p: number, s: number, c: number): number;
  _gen4wild_result_ptr(): number;
  _gen4wild_result_count(): number;
  _gen4wild_last_error(): number;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Module>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Module | undefined;
function post(message: Gen4WildWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}
function gameToWasm(version: Gen4WildGeneratorRequest["profile"]["version"]) {
  return {
    diamond: 1 << 7,
    pearl: 1 << 8,
    platinum: 1 << 9,
    heartgold: 1 << 10,
    soulsilver: 1 << 11,
  }[version];
}
const REQUEST_WORDS = 75;
function requestStruct(
  request: Gen4WildGeneratorRequest | Gen4WildSearcherRequest,
  pointer: number,
  words: Uint32Array,
) {
  const generator = "seed" in request;
  const profile = request.profile;
  const generated = request as Gen4WildGeneratorRequest;
  words[0] = pointer;
  words[1] = request.area.slots.length;
  words[2] = generator ? generated.seed : 0;
  words[3] = generator ? generated.initialAdvances : 0;
  words[4] = generator ? generated.maxAdvances : 0;
  words[5] = generator ? generated.offset : 0;
  words[6] = gen4WildMethodToWasm(request.method);
  words[7] = gen4WildLeadToWasm(request.lead, request.synchronizeNature);
  words[8] = gen4WildEncounterToWasm(request.area.encounter);
  words[9] = request.area.rate;
  words[10] = request.area.location;
  words[11] = profile.tid;
  words[12] = profile.sid;
  words[13] = gameToWasm(profile.version);
  words[14] = generator ? 0 : request.minAdvance;
  words[15] = generator ? 0 : request.maxAdvance;
  words[16] = generator ? 0 : request.minDelay;
  words[17] = generator ? 0 : request.maxDelay;
  words[18] = request.feebasTile ? 1 : 0;
  words[19] = 0;
  words[20] = request.happiness;
  words[21] = request.fixedSlot;
  words[22] = request.pokeRadarShiny ? 1 : 0;
  words[23] = request.unownRadio ? 1 : 0;
  words[24] = profile.nationalDex ? 1 : 0;
  words[25] = gen4WildFilterCode(request.filters.shiny);
  words[26] = gen4WildFilterCode(request.filters.gender);
  words[27] = gen4WildFilterCode(request.filters.ability);
  words[28] = request.filters.natureMask;
  words[29] = request.filters.hiddenPowerMask;
  words[30] = request.filters.encounterSlotMask;
  words[31] = request.filters.levelMin;
  words[32] = request.filters.levelMax;
  for (let i = 0; i < 6; i++) {
    words[33 + i] = request.filters.ivMin[i];
    words[39 + i] = request.filters.ivMax[i];
  }
  for (let i = 0; i < 26; i++)
    words[45 + i] = profile.unownDiscovered[i] ? 1 : 0;
  for (let i = 0; i < 4; i++) words[71 + i] = profile.unownPuzzles[i] ? 1 : 0;
}
async function init(message: Extract<Gen4WildWorkerRequest, { type: "init" }>) {
  if (
    message.moduleId !== "gen4wild" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_WILD_API_VERSION
  )
    throw new Error("Gen4 wild Worker init contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen4 wild Wasm factory missing.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen4wild_api_version() !== GEN4_WILD_API_VERSION)
    throw new Error("Gen4 wild Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen4wild",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN4_WILD_API_VERSION,
    operations: ["generator", "searcher"],
  });
}
function run(message: Extract<Gen4WildWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen4 wild Wasm is not initialized.");
  if (
    message.moduleId !== "gen4wild" ||
    message.apiVersion !== GEN4_WILD_API_VERSION ||
    message.chunkIndex !== message.chunk.index
  )
    throw new Error("Gen4 wild Worker task contract mismatch.");
  const generator = message.operation === "generator";
  if (
    generator !== "initialAdvances" in message.chunk ||
    generator !== "seed" in message.request
  )
    throw new Error("Gen4 wild Worker task payload mismatch.");
  if (
    !Number.isInteger(message.chunk.index) ||
    message.chunk.index < 0 ||
    !Number.isInteger(message.chunk.stateCount) ||
    message.chunk.stateCount < 1
  )
    throw new Error("Gen4 wild Worker chunk boundary mismatch.");
  if (generator) {
    const chunk = message.chunk as Gen4WildChunk;
    if (
      chunk.stateCount > GEN4_WILD_CHUNK_SIZE ||
      chunk.maxAdvances + 1 !== chunk.stateCount
    )
      throw new Error("Gen4 wild Generator chunk boundary mismatch.");
  } else {
    const chunk = message.chunk as Gen4WildSearcherChunk;
    if (
      chunk.stateCount > GEN4_WILD_SEARCHER_CHUNK_SIZE ||
      !Number.isInteger(chunk.startIndex) ||
      chunk.startIndex < 0 ||
      chunk.startIndex + chunk.stateCount >
        gen4WildSearcherCombinationCount(
          message.request as Gen4WildSearcherRequest,
        )
    )
      throw new Error("Gen4 wild Searcher chunk boundary mismatch.");
  }
  const request = generator
    ? {
        ...message.request,
        initialAdvances: (message.chunk as Gen4WildChunk).initialAdvances,
        maxAdvances: (message.chunk as Gen4WildChunk).maxAdvances,
      }
    : message.request;
  const validationErrors = generator
    ? validateGen4WildGeneratorRequest(request as Gen4WildGeneratorRequest)
    : validateGen4WildSearcherRequest(request as Gen4WildSearcherRequest);
  if (validationErrors.length > 0)
    throw new Error(
      `Invalid Gen4 wild request: ${validationErrors.join(", ")}.`,
    );
  const packed = packGen4WildSlots(request.area.slots);
  const slotPointer = wasm._malloc(packed.byteLength);
  const structPointer = wasm._malloc(REQUEST_WORDS * 4);
  const startedAt = performance.now();
  try {
    if (slotPointer === 0 || structPointer === 0)
      throw new Error("Gen4 wild Wasm allocation failed.");
    wasm.HEAPU32.set(packed, slotPointer >>> 2);
    const struct = new Uint32Array(
      wasm.HEAPU32.buffer,
      structPointer,
      REQUEST_WORDS,
    );
    requestStruct(request, slotPointer, struct);
    const start = generator
      ? 0
      : (message.chunk as Gen4WildSearcherChunk).startIndex;
    const count = generator ? 0 : message.chunk.stateCount;
    const result = generator
      ? wasm._gen4wild_generate(structPointer)
      : wasm._gen4wild_search(structPointer, start, count);
    if (wasm._gen4wild_last_error())
      throw new Error("Gen4 wild Wasm returned an error.");
    const actual = wasm._gen4wild_result_count();
    if (result !== actual)
      throw new Error("Gen4 wild result count changed before copy.");
    if (
      !Number.isInteger(actual) ||
      actual < 0 ||
      actual > GEN4_WILD_MAX_RESULTS
    )
      throw new Error("Gen4 wild Wasm returned an invalid result count.");
    const wordsPer = 22;
    const resultPointer = wasm._gen4wild_result_ptr();
    const resultWords = actual * wordsPer;
    if (
      resultPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      (resultWords > 0 && resultPointer === 0) ||
      resultPointer / Uint32Array.BYTES_PER_ELEMENT + resultWords >
        wasm.HEAPU32.length
    )
      throw new Error("Gen4 wild Wasm returned an invalid result buffer.");
    const ptr = resultPointer / Uint32Array.BYTES_PER_ELEMENT;
    const output = wasm.HEAPU32.slice(ptr, ptr + resultWords);
    post(
      {
        type: "batch",
        moduleId: "gen4wild",
        apiVersion: GEN4_WILD_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.stateCount,
        resultCount: actual,
        elapsedMs: performance.now() - startedAt,
        buffer: output.buffer,
      },
      [output.buffer],
    );
  } finally {
    wasm._free(slotPointer);
    wasm._free(structPointer);
  }
}
scope.onmessage = async ({ data }: MessageEvent<Gen4WildWorkerRequest>) => {
  try {
    if (data.type === "init") await init(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4wild",
      apiVersion: GEN4_WILD_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
