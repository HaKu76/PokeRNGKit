/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_HIDDEN_GROTTO_API_VERSION,
  gen5HiddenGrottoLeadValue,
  gen5HiddenGrottoPowerValue,
  validateGen5HiddenGrottoRequest,
  type Gen5HiddenGrottoRequest,
} from "../domain";
import type {
  Gen5HiddenGrottoWorkerRequest,
  Gen5HiddenGrottoWorkerResponse,
} from "./messages";

const REQUEST_WORDS = 116;
const RESULT_WORDS = 16;

interface Gen5HiddenGrottoEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5hiddengrotto_api_version(): number;
  _gen5hiddengrotto_configure_cache(
    ivEntriesPointer: number,
    ivEntryCount: number,
    shaEntriesPointer: number,
    shaEntryCount: number,
  ): number;
  _gen5hiddengrotto_clear_cache(): void;
  _gen5hiddengrotto_search(requestPointer: number): number;
  _gen5hiddengrotto_result_ptr(): number;
  _gen5hiddengrotto_result_count(): number;
  _gen5hiddengrotto_processed_count(): number;
  _gen5hiddengrotto_limit_reached(): number;
  _gen5hiddengrotto_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5HiddenGrottoEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5HiddenGrottoEmscriptenModule | undefined;

function post(
  message: Gen5HiddenGrottoWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0)
    throw new TypeError(`Unsupported Gen 5 Hidden Grotto value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function dateParts(value: string) {
  return value.split("-").map(Number) as [number, number, number];
}

function workflowValue(request: Gen5HiddenGrottoRequest) {
  return [
    "slot-generator",
    "slot-searcher",
    "pokemon-generator",
    "pokemon-searcher",
  ].indexOf(request.operation);
}

function packRequest(
  request: Gen5HiddenGrottoRequest,
  chunk: { start: number; count: number },
) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.profile.mac);
  const generator = "seed" in request;
  const pokemon = request.operation.startsWith("pokemon");
  const speciesFormGender = request.area.pokemon.map(
    (slot) => slot.species | (slot.form << 11) | (slot.genderThreshold << 16),
  );
  const minMaxLevels = request.area.pokemon.map(
    (slot) => slot.minLevel | (slot.maxLevel << 8),
  );
  const values = [
    workflowValue(request),
    request.profile.version === "black2" ? 2 : 3,
    indexed(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const,
      request.profile.language,
    ),
    indexed(["ds", "dsi", "3ds"] as const, request.profile.dsType),
    macLow,
    macHigh,
    request.profile.vcount,
    request.profile.timer0Min,
    request.profile.timer0Max,
    request.profile.gxstat,
    request.profile.vframe,
    request.profile.keypresses.reduce(
      (mask, enabled, index) => mask | (enabled ? 1 << index : 0),
      0,
    ),
    request.profile.skipLR ? 1 : 0,
    request.profile.memoryLink ? 1 : 0,
    request.profile.shinyCharm ? 1 : 0,
    request.profile.tid,
    request.profile.sid,
    request.initialAdvances,
    request.maxAdvances,
    request.offset,
    request.initialIvAdvances,
    request.maxIvAdvances,
    gen5HiddenGrottoLeadValue(request.lead),
    gen5HiddenGrottoPowerValue(request.grottoPower),
    request.selectedGroup,
    request.selectedSlot,
    request.gender,
    request.pokemonFilters.disabled ? 1 : 0,
    request.pokemonFilters.natureMask,
    request.pokemonFilters.hiddenPowerMask,
    request.pokemonFilters.levelMin,
    request.pokemonFilters.levelMax,
    ...request.pokemonFilters.ivMin,
    ...request.pokemonFilters.ivMax,
    request.pokemonFilters.perfectIvValue,
    request.pokemonFilters.perfectIvCount,
    request.slotFilters.slotMask,
    request.slotFilters.genderMask,
    request.slotFilters.groupMask,
    request.resultLimit,
    ...(generator ? splitHex(request.seed) : [0, 0]),
    ...(!generator
      ? [...dateParts(request.startDate), ...dateParts(request.endDate)]
      : [0, 0, 0, 0, 0, 0]),
    chunk.start,
    chunk.count,
    ...speciesFormGender,
    ...minMaxLevels,
    ...request.area.items,
    ...request.area.hiddenItems,
  ];
  if (values.length !== REQUEST_WORDS || (!pokemon && request.cache !== null))
    throw new Error(
      "Gen 5 Hidden Grotto request packing changed unexpectedly.",
    );
  words.set(values.map((value) => value >>> 0));
  return words;
}

function copyCacheWords(buffer: ArrayBuffer, expectedWords: number) {
  if (buffer.byteLength !== expectedWords * Uint32Array.BYTES_PER_ELEMENT)
    throw new TypeError(
      "Gen 5 Hidden Grotto cache length does not match its descriptor.",
    );
  return new Uint32Array(buffer);
}

function configureCache(
  message: Extract<Gen5HiddenGrottoWorkerRequest, { type: "cache" }>,
) {
  if (!wasm)
    throw new Error("Gen 5 Hidden Grotto Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5hiddengrotto" ||
    message.apiVersion !== GEN5_HIDDEN_GROTTO_API_VERSION ||
    !message.cacheKey ||
    !Number.isInteger(message.ivEntryCount) ||
    message.ivEntryCount < 1 ||
    !Number.isInteger(message.shaEntryCount) ||
    message.shaEntryCount < 0 ||
    (message.mode === "iv" && message.shaEntryCount !== 0) ||
    (message.mode === "iv-sha" && message.shaEntryCount < 1)
  )
    throw new TypeError("Invalid Gen 5 Hidden Grotto Worker cache.");
  const ivEntries = copyCacheWords(message.ivEntries, message.ivEntryCount * 2);
  const shaEntries = message.shaEntries
    ? copyCacheWords(message.shaEntries, message.shaEntryCount * 4)
    : new Uint32Array();
  const ivPointer = wasm._malloc(ivEntries.byteLength);
  const shaPointer = shaEntries.byteLength
    ? wasm._malloc(shaEntries.byteLength)
    : 0;
  if (ivPointer === 0 || (shaEntries.byteLength !== 0 && shaPointer === 0)) {
    if (ivPointer !== 0) wasm._free(ivPointer);
    if (shaPointer !== 0) wasm._free(shaPointer);
    throw new Error("Gen 5 Hidden Grotto Wasm cache allocation failed.");
  }
  try {
    wasm.HEAPU32.set(ivEntries, ivPointer >>> 2);
    if (shaPointer !== 0) wasm.HEAPU32.set(shaEntries, shaPointer >>> 2);
    if (
      wasm._gen5hiddengrotto_configure_cache(
        ivPointer,
        message.ivEntryCount,
        shaPointer,
        message.shaEntryCount,
      ) !== 1
    )
      throw new Error("Gen 5 Hidden Grotto Wasm rejected the search cache.");
  } finally {
    wasm._free(ivPointer);
    if (shaPointer !== 0) wasm._free(shaPointer);
  }
  post({
    type: "cache-ready",
    moduleId: "gen5hiddengrotto",
    apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
    cacheKey: message.cacheKey,
  });
}

function clearCache() {
  if (!wasm)
    throw new Error("Gen 5 Hidden Grotto Wasm module is not initialized.");
  wasm._gen5hiddengrotto_clear_cache();
  post({
    type: "cache-ready",
    moduleId: "gen5hiddengrotto",
    apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
    cacheKey: "",
  });
}

async function initialize(
  message: Extract<Gen5HiddenGrottoWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5hiddengrotto" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_HIDDEN_GROTTO_API_VERSION
  )
    throw new Error("Gen 5 Hidden Grotto Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
    createGen5HiddenGrottoModule?: Factory;
  };
  const factory = namespace.default ?? namespace.createGen5HiddenGrottoModule;
  if (typeof factory !== "function")
    throw new TypeError("Gen 5 Hidden Grotto Wasm module has no factory.");
  wasm = await factory({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5hiddengrotto_api_version();
  if (apiVersion !== GEN5_HIDDEN_GROTTO_API_VERSION)
    throw new Error(
      `Gen 5 Hidden Grotto Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5hiddengrotto",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: [
      "slot-generator",
      "slot-searcher",
      "pokemon-generator",
      "pokemon-searcher",
    ],
  });
}

function search(
  message: Extract<Gen5HiddenGrottoWorkerRequest, { type: "task" }>,
) {
  if (!wasm)
    throw new Error("Gen 5 Hidden Grotto Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5hiddengrotto" ||
    message.apiVersion !== GEN5_HIDDEN_GROTTO_API_VERSION ||
    message.operation !== message.request.operation ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.start) ||
    !Number.isInteger(message.chunk.count) ||
    message.chunk.start < 0 ||
    message.chunk.count < 1
  )
    throw new TypeError("Invalid Gen 5 Hidden Grotto Worker task.");
  validateGen5HiddenGrottoRequest(message.request);
  const request = packRequest(message.request, message.chunk);
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 Hidden Grotto Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error(
        "Gen 5 Hidden Grotto Wasm request pointer is not aligned.",
      );
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 Hidden Grotto Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen5hiddengrotto_search(requestPointer);
    const error = wasm._gen5hiddengrotto_last_error();
    if (error !== 0)
      throw new Error(`Gen 5 Hidden Grotto Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5hiddengrotto_result_count()
    )
      throw new Error(
        "Gen 5 Hidden Grotto Wasm returned an invalid result count.",
      );
    const resultPointer = wasm._gen5hiddengrotto_result_ptr();
    const byteLength =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError(
        "Gen 5 Hidden Grotto Wasm result pointer is invalid.",
      );
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    const processed = wasm._gen5hiddengrotto_processed_count();
    const limitReached = wasm._gen5hiddengrotto_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    )
      throw new Error(
        "Gen 5 Hidden Grotto Wasm returned an invalid processed count.",
      );
    post(
      {
        type: "batch",
        moduleId: "gen5hiddengrotto",
        apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: processed,
        resultCount,
        limitReached,
        buffer: copied.buffer,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(requestPointer);
  }
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen5HiddenGrottoWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else if (data.type === "cache") configureCache(data);
    else if (data.type === "cache-clear") clearCache();
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5hiddengrotto",
      apiVersion: GEN5_HIDDEN_GROTTO_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
