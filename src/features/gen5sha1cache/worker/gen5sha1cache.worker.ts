/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_SHA1CACHE_API_VERSION,
  GEN5_SHA1CACHE_BATCH_RESULT_LIMIT,
  GEN5_SHA1CACHE_BUTTON_MASKS,
  GEN5_SHA1CACHE_RESULT_WORDS,
  GEN5_SHA1CACHE_SECONDS_PER_UNIT,
} from "../domain";
import type {
  Gen5Sha1CacheWorkerRequest,
  Gen5Sha1CacheWorkerResponse,
} from "./messages";

const REQUEST_WORDS = 14;

interface Gen5Sha1CacheEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5sha1cache_api_version(): number;
  _gen5sha1cache_search(
    requestPointer: number,
    entralinkPointer: number,
    entralinkCount: number,
    normalPointer: number,
    normalCount: number,
    roamerPointer: number,
    roamerCount: number,
  ): number;
  _gen5sha1cache_result_ptr(): number;
  _gen5sha1cache_result_count(): number;
  _gen5sha1cache_processed_count(): number;
  _gen5sha1cache_limit_reached(): number;
  _gen5sha1cache_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5Sha1CacheEmscriptenModule>;

interface SeedPointers {
  entralinkPointer: number;
  entralinkCount: number;
  normalPointer: number;
  normalCount: number;
  roamerPointer: number;
  roamerCount: number;
}

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5Sha1CacheEmscriptenModule | undefined;
let seedPointers: SeedPointers | undefined;

function post(
  message: Gen5Sha1CacheWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0) throw new TypeError(`Unsupported Gen 5 value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  if (!/^[0-9a-f]{1,12}$/i.test(value || "0"))
    throw new TypeError("Invalid Gen 5 MAC address.");
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function copySeeds(buffer: ArrayBuffer) {
  if (!wasm) throw new Error("Gen 5 SHA1 Cache Wasm is not initialized.");
  if (buffer.byteLength % Uint32Array.BYTES_PER_ELEMENT !== 0)
    throw new RangeError("Gen 5 SHA1 Cache seed buffer is misaligned.");
  const values = new Uint32Array(buffer);
  if (values.length === 0) return { pointer: 0, count: 0 };
  const pointer = wasm._malloc(buffer.byteLength);
  if (
    pointer === 0 ||
    (pointer & 3) !== 0 ||
    pointer + buffer.byteLength > wasm.HEAPU8.byteLength
  )
    throw new RangeError("Gen 5 SHA1 Cache seed allocation failed.");
  wasm.HEAPU32.set(values, pointer >>> 2);
  return { pointer, count: values.length };
}

async function initialize(
  message: Extract<Gen5Sha1CacheWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5sha1cache" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_SHA1CACHE_API_VERSION
  )
    throw new Error("Gen 5 SHA1 Cache Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 SHA1 Cache Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5sha1cache_api_version();
  if (apiVersion !== GEN5_SHA1CACHE_API_VERSION)
    throw new Error(
      `Gen 5 SHA1 Cache Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5sha1cache",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function prepare(
  message: Extract<Gen5Sha1CacheWorkerRequest, { type: "prepare" }>,
) {
  if (!wasm) throw new Error("Gen 5 SHA1 Cache Wasm is not initialized.");
  if (
    message.moduleId !== "gen5sha1cache" ||
    message.apiVersion !== GEN5_SHA1CACHE_API_VERSION ||
    seedPointers
  )
    throw new TypeError("Invalid Gen 5 SHA1 Cache prepare message.");
  const allocated: number[] = [];
  try {
    const entralink = copySeeds(message.entralink);
    if (entralink.pointer) allocated.push(entralink.pointer);
    const normal = copySeeds(message.normal);
    if (normal.pointer) allocated.push(normal.pointer);
    const roamer = copySeeds(message.roamer);
    if (roamer.pointer) allocated.push(roamer.pointer);
    seedPointers = {
      entralinkPointer: entralink.pointer,
      entralinkCount: entralink.count,
      normalPointer: normal.pointer,
      normalCount: normal.count,
      roamerPointer: roamer.pointer,
      roamerCount: roamer.count,
    };
    post({
      type: "prepared",
      moduleId: "gen5sha1cache",
      apiVersion: GEN5_SHA1CACHE_API_VERSION,
    });
  } catch (error) {
    allocated.forEach((pointer) => wasm?._free(pointer));
    throw error;
  }
}

function packRequest(
  message: Extract<Gen5Sha1CacheWorkerRequest, { type: "task" }>,
) {
  const { profile, resultLimit } = message.request;
  const { timer0, date, buttonMask } = message.chunk;
  const parts = date.split("-").map(Number);
  const [macLow, macHigh] = splitHex(profile.mac);
  const values = [
    indexed(["black", "white", "black2", "white2"] as const, profile.version),
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
      profile.language,
    ),
    indexed(["ds", "dsi", "3ds"] as const, profile.dsType),
    macLow,
    macHigh,
    profile.vcount,
    timer0,
    profile.gxstat,
    profile.vframe,
    ...parts,
    buttonMask,
    resultLimit,
  ];
  if (
    values.length !== REQUEST_WORDS ||
    parts.length !== 3 ||
    !GEN5_SHA1CACHE_BUTTON_MASKS.includes(buttonMask) ||
    !Number.isInteger(resultLimit) ||
    resultLimit < 1 ||
    resultLimit > GEN5_SHA1CACHE_BATCH_RESULT_LIMIT
  )
    throw new TypeError("Invalid Gen 5 SHA1 Cache Worker task.");
  return new Uint32Array(values.map((value) => value >>> 0));
}

function search(
  message: Extract<Gen5Sha1CacheWorkerRequest, { type: "task" }>,
) {
  if (!wasm || !seedPointers)
    throw new Error("Gen 5 SHA1 Cache Worker is not prepared.");
  if (
    message.moduleId !== "gen5sha1cache" ||
    message.apiVersion !== GEN5_SHA1CACHE_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunkIndex !== message.chunk.index ||
    !Number.isSafeInteger(message.chunkIndex) ||
    message.chunkIndex < 0
  )
    throw new TypeError("Invalid Gen 5 SHA1 Cache Worker task.");
  const request = packRequest(message);
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 SHA1 Cache Wasm allocation failed.");
  try {
    if (
      (requestPointer & 3) !== 0 ||
      requestPointer + request.byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError("Gen 5 SHA1 Cache request pointer is invalid.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const startedAt = performance.now();
    const resultCount = wasm._gen5sha1cache_search(
      requestPointer,
      seedPointers.entralinkPointer,
      seedPointers.entralinkCount,
      seedPointers.normalPointer,
      seedPointers.normalCount,
      seedPointers.roamerPointer,
      seedPointers.roamerCount,
    );
    const error = wasm._gen5sha1cache_last_error();
    if (error !== 0)
      throw new Error(`Gen 5 SHA1 Cache Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5sha1cache_result_count()
    )
      throw new Error("Gen 5 SHA1 Cache Wasm returned an invalid count.");
    const resultPointer = wasm._gen5sha1cache_result_ptr();
    const byteLength = resultCount * GEN5_SHA1CACHE_RESULT_WORDS * 4;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError("Gen 5 SHA1 Cache result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * GEN5_SHA1CACHE_RESULT_WORDS,
    );
    const processedCount = wasm._gen5sha1cache_processed_count();
    const limitReached = wasm._gen5sha1cache_limit_reached() === 1;
    if (
      processedCount > GEN5_SHA1CACHE_SECONDS_PER_UNIT ||
      (!limitReached && processedCount !== GEN5_SHA1CACHE_SECONDS_PER_UNIT)
    )
      throw new Error("Gen 5 SHA1 Cache Wasm returned invalid progress.");
    post(
      {
        type: "batch",
        moduleId: "gen5sha1cache",
        apiVersion: GEN5_SHA1CACHE_API_VERSION,
        taskId: message.taskId,
        operation: "searcher",
        chunkIndex: message.chunkIndex,
        processedCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: copied.buffer,
        limitReached,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(requestPointer);
  }
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen5Sha1CacheWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else if (data.type === "prepare") prepare(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5sha1cache",
      apiVersion: GEN5_SHA1CACHE_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init"
          ? "initialization_failed"
          : data.type === "prepare"
            ? "prepare_failed"
            : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
