/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  validateGen5CalibrationRequest,
  type Gen5CalibrationRequest,
} from "../domain";
import type {
  Gen5ProfilesWorkerRequest,
  Gen5ProfilesWorkerResponse,
} from "./messages";

const GEN5_PROFILES_API_VERSION = 1;
const REQUEST_WORDS = 39;
const RESULT_WORDS = 4;

interface Gen5ProfilesEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5profiles_api_version(): number;
  _gen5profiles_search(
    requestPointer: number,
    needlesPointer: number,
    needleCount: number,
  ): number;
  _gen5profiles_result_ptr(): number;
  _gen5profiles_result_count(): number;
  _gen5profiles_processed_low(): number;
  _gen5profiles_processed_high(): number;
  _gen5profiles_limit_reached(): number;
  _gen5profiles_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5ProfilesEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5ProfilesEmscriptenModule | undefined;

function post(
  message: Gen5ProfilesWorkerResponse,
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
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function packRequest(request: Gen5CalibrationRequest) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.mac);
  const [seedLow, seedHigh] = splitHex(request.seed || "0");
  const [year, month, day] = request.date.split("-").map(Number);
  let offset = 0;
  const push = (value: number) => {
    words[offset] = value >>> 0;
    offset += 1;
  };
  push(indexed(["ivs", "needles", "seed"] as const, request.mode));
  push(
    indexed(["black", "white", "black2", "white2"] as const, request.version),
  );
  push(
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
      request.language,
    ),
  );
  push(indexed(["ds", "dsi", "3ds"] as const, request.dsType));
  [
    macLow,
    macHigh,
    request.buttonMask,
    year,
    month,
    day,
    request.hour,
    request.minute,
    request.minSeconds,
    request.maxSeconds,
    request.minVCount,
    request.maxVCount,
    request.minTimer0,
    request.maxTimer0,
    request.minGxStat,
    request.maxGxStat,
    request.minVFrame,
    request.maxVFrame,
  ].forEach(push);
  request.minIVs.forEach(push);
  request.maxIVs.forEach(push);
  push(request.needleType === "unova-link" ? 0 : 1);
  push(request.memoryLink ? 1 : 0);
  push(seedLow);
  push(seedHigh);
  push(request.resultLimit);
  if (offset !== REQUEST_WORDS)
    throw new Error("Gen 5 profile request packing changed unexpectedly.");
  return words;
}

function processedCount(module: Gen5ProfilesEmscriptenModule) {
  return (
    module._gen5profiles_processed_high() * 0x1_0000_0000 +
    module._gen5profiles_processed_low()
  );
}

async function initialize(
  message: Extract<Gen5ProfilesWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5profiles" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_PROFILES_API_VERSION
  )
    throw new Error("Gen 5 profile Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 profile Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5profiles_api_version();
  if (apiVersion !== GEN5_PROFILES_API_VERSION)
    throw new Error(
      `Gen 5 profile Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5profiles",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function search(message: Extract<Gen5ProfilesWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 profile Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5profiles" ||
    message.apiVersion !== GEN5_PROFILES_API_VERSION ||
    message.operation !== "searcher" ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0 ||
    message.chunk.index !== message.chunkIndex
  )
    throw new TypeError("Invalid Gen 5 profile Worker task.");
  validateGen5CalibrationRequest(message.request);
  if (
    !Number.isInteger(message.chunk.minVFrame) ||
    !Number.isInteger(message.chunk.maxVFrame) ||
    message.chunk.minVFrame < message.request.minVFrame ||
    message.chunk.maxVFrame > message.request.maxVFrame ||
    message.chunk.minVFrame > message.chunk.maxVFrame
  )
    throw new RangeError("Invalid Gen 5 profile Worker chunk.");

  const request = packRequest({
    ...message.request,
    minVFrame: message.chunk.minVFrame,
    maxVFrame: message.chunk.maxVFrame,
  });
  const needles = Uint8Array.from(message.request.needles);
  const requestPointer = wasm._malloc(request.byteLength);
  const needlesPointer =
    needles.byteLength === 0 ? 0 : wasm._malloc(needles.byteLength);
  if (
    requestPointer === 0 ||
    (needles.byteLength !== 0 && needlesPointer === 0)
  ) {
    if (requestPointer !== 0) wasm._free(requestPointer);
    throw new Error("Gen 5 profile Wasm allocation failed.");
  }

  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 profile Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 profile Wasm request exceeds memory.");
    if (
      needlesPointer !== 0 &&
      needlesPointer + needles.byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError("Gen 5 profile Wasm needles exceed memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    if (needlesPointer !== 0) wasm.HEAPU8.set(needles, needlesPointer);

    const startedAt = performance.now();
    const resultCount = wasm._gen5profiles_search(
      requestPointer,
      needlesPointer,
      needles.length,
    );
    const error = wasm._gen5profiles_last_error();
    if (error !== 0)
      throw new Error(`Gen 5 profile Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5profiles_result_count()
    )
      throw new Error("Gen 5 profile Wasm returned an invalid result count.");
    const resultPointer = wasm._gen5profiles_result_ptr();
    const byteLength =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    )
      throw new RangeError("Gen 5 profile Wasm result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    const processed = processedCount(wasm);
    if (!Number.isSafeInteger(processed) || processed < 0)
      throw new Error(
        "Gen 5 profile Wasm returned an invalid processed count.",
      );
    post(
      {
        type: "batch",
        moduleId: "gen5profiles",
        apiVersion: GEN5_PROFILES_API_VERSION,
        taskId: message.taskId,
        operation: "searcher",
        chunkIndex: message.chunkIndex,
        processedCount: processed,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: copied.buffer,
        limitReached: wasm._gen5profiles_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(requestPointer);
    if (needlesPointer !== 0) wasm._free(needlesPointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen5ProfilesWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5profiles",
      apiVersion: GEN5_PROFILES_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
