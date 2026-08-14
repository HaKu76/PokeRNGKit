/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_STATIC_API_VERSION,
  gen5StaticLeadValue,
  validateGen5StaticRequest,
  type Gen5StaticRequest,
} from "../domain";
import type {
  Gen5StaticWorkerRequest,
  Gen5StaticWorkerResponse,
} from "./messages";

const REQUEST_WORDS = 62;
const RESULT_WORDS = 12;

interface Gen5StaticEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5static_api_version(): number;
  _gen5static_configure_cache(
    ivEntriesPointer: number,
    ivEntryCount: number,
    shaEntriesPointer: number,
    shaEntryCount: number,
  ): number;
  _gen5static_clear_cache(): void;
  _gen5static_search(requestPointer: number): number;
  _gen5static_result_ptr(): number;
  _gen5static_result_count(): number;
  _gen5static_processed_count(): number;
  _gen5static_limit_reached(): number;
  _gen5static_last_error(): number;
}

function copyCacheWords(buffer: ArrayBuffer, expectedWords: number) {
  if (buffer.byteLength !== expectedWords * Uint32Array.BYTES_PER_ELEMENT)
    throw new TypeError(
      "Gen 5 Static cache length does not match its descriptor.",
    );
  return new Uint32Array(buffer);
}

function configureCache(
  message: Extract<Gen5StaticWorkerRequest, { type: "cache" }>,
) {
  if (!wasm) throw new Error("Gen 5 Static Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5static" ||
    message.apiVersion !== GEN5_STATIC_API_VERSION ||
    !message.cacheKey ||
    !Number.isInteger(message.ivEntryCount) ||
    message.ivEntryCount < 1 ||
    !Number.isInteger(message.shaEntryCount) ||
    message.shaEntryCount < 0 ||
    (message.mode === "iv" && message.shaEntryCount !== 0) ||
    (message.mode === "iv-sha" && message.shaEntryCount < 1)
  ) {
    throw new TypeError("Invalid Gen 5 Static Worker cache.");
  }
  const ivEntries = copyCacheWords(message.ivEntries, message.ivEntryCount * 2);
  const shaEntries = message.shaEntries
    ? copyCacheWords(message.shaEntries, message.shaEntryCount * 4)
    : new Uint32Array();
  if (shaEntries.length === 0 && message.shaEntryCount !== 0)
    throw new TypeError("Gen 5 Static SHA1 cache data is missing.");
  const ivPointer = wasm._malloc(ivEntries.byteLength);
  const shaPointer = shaEntries.byteLength
    ? wasm._malloc(shaEntries.byteLength)
    : 0;
  if (ivPointer === 0 || (shaEntries.byteLength !== 0 && shaPointer === 0)) {
    if (ivPointer !== 0) wasm._free(ivPointer);
    if (shaPointer !== 0) wasm._free(shaPointer);
    throw new Error("Gen 5 Static Wasm cache allocation failed.");
  }
  try {
    wasm.HEAPU32.set(ivEntries, ivPointer >>> 2);
    if (shaPointer !== 0) wasm.HEAPU32.set(shaEntries, shaPointer >>> 2);
    if (
      wasm._gen5static_configure_cache(
        ivPointer,
        message.ivEntryCount,
        shaPointer,
        message.shaEntryCount,
      ) !== 1
    ) {
      throw new Error("Gen 5 Static Wasm rejected the search cache.");
    }
  } finally {
    wasm._free(ivPointer);
    if (shaPointer !== 0) wasm._free(shaPointer);
  }
  post({
    type: "cache-ready",
    moduleId: "gen5static",
    apiVersion: GEN5_STATIC_API_VERSION,
    cacheKey: message.cacheKey,
  });
}

function clearCache() {
  if (!wasm) throw new Error("Gen 5 Static Wasm module is not initialized.");
  wasm._gen5static_clear_cache();
  post({
    type: "cache-ready",
    moduleId: "gen5static",
    apiVersion: GEN5_STATIC_API_VERSION,
    cacheKey: "",
  });
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5StaticEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5StaticEmscriptenModule | undefined;

function post(
  message: Gen5StaticWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0)
    throw new TypeError(`Unsupported Gen 5 Static value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function dateParts(value: string) {
  return value.split("-").map(Number) as [number, number, number];
}

function packRequest(
  request: Gen5StaticRequest,
  chunk: { start: number; count: number },
) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.profile.mac);
  const flags =
    (request.template.wild ? 1 : 0) |
    (request.template.egg ? 2 : 0) |
    (request.template.roamer ? 4 : 0) |
    (request.template.curtis ? 8 : 0) |
    (request.template.yancy ? 16 : 0);
  const values = [
    request.mode === "generator" ? 0 : 1,
    indexed(
      ["black", "white", "black2", "white2"] as const,
      request.profile.version,
    ),
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
    gen5StaticLeadValue(request.lead),
    request.luckyPower === "level3" ? 3 : 0,
    request.template.level,
    indexed(["random", "never", "always"] as const, request.template.shiny),
    request.template.ability,
    request.template.gender,
    request.template.personal.gender,
    ...request.template.personal.abilities,
    flags,
    request.filters.disabled ? 1 : 0,
    request.filters.ability,
    request.filters.gender,
    request.filters.shiny,
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.resultLimit,
    ...(request.mode === "generator" ? [...splitHex(request.seed)] : [0, 0]),
    ...(request.mode === "searcher"
      ? [...dateParts(request.startDate), ...dateParts(request.endDate)]
      : [0, 0, 0, 0, 0, 0]),
    chunk.start,
    chunk.count,
  ];
  if (values.length !== REQUEST_WORDS)
    throw new Error("Gen 5 Static request packing changed unexpectedly.");
  words.set(values.map((value) => value >>> 0));
  return words;
}

async function initialize(
  message: Extract<Gen5StaticWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5static" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_STATIC_API_VERSION
  ) {
    throw new Error("Gen 5 Static Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 Static Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5static_api_version();
  if (apiVersion !== GEN5_STATIC_API_VERSION)
    throw new Error(
      `Gen 5 Static Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5static",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function search(message: Extract<Gen5StaticWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 Static Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5static" ||
    message.apiVersion !== GEN5_STATIC_API_VERSION ||
    message.operation !== message.request.mode ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.start) ||
    !Number.isInteger(message.chunk.count) ||
    message.chunk.start < 0 ||
    message.chunk.count < 1
  ) {
    throw new TypeError("Invalid Gen 5 Static Worker task.");
  }
  validateGen5StaticRequest(message.request);
  const request = packRequest(message.request, message.chunk);
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 Static Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 Static Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 Static Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen5static_search(requestPointer);
    const error = wasm._gen5static_last_error();
    if (error !== 0)
      throw new Error(`Gen 5 Static Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5static_result_count()
    ) {
      throw new Error("Gen 5 Static Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen5static_result_ptr();
    const byteLength =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 5 Static Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    const processed = wasm._gen5static_processed_count();
    const limitReached = wasm._gen5static_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    ) {
      throw new Error("Gen 5 Static Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen5static",
        apiVersion: GEN5_STATIC_API_VERSION,
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

scope.onmessage = async ({ data }: MessageEvent<Gen5StaticWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else if (data.type === "cache") configureCache(data);
    else if (data.type === "cache-clear") clearCache();
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5static",
      apiVersion: GEN5_STATIC_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
