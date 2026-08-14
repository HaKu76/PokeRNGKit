/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import { validateGen5IdRequest, type Gen5IdRequest } from "../domain";
import type { Gen5IdWorkerRequest, Gen5IdWorkerResponse } from "./messages";

const GEN5_ID_API_VERSION = 1;
const REQUEST_WORDS = 31;
const RESULT_WORDS = 9;

interface Gen5IdEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5id_api_version(): number;
  _gen5id_search(requestPointer: number): number;
  _gen5id_result_ptr(): number;
  _gen5id_result_count(): number;
  _gen5id_processed_low(): number;
  _gen5id_processed_high(): number;
  _gen5id_limit_reached(): number;
  _gen5id_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5IdEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5IdEmscriptenModule | undefined;

function post(message: Gen5IdWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0) throw new TypeError(`Unsupported Gen 5 ID value: ${value}.`);
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
  request: Gen5IdRequest,
  chunk: { startUnit: number; unitCount: number },
) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.profile.mac);
  const start = dateParts(
    request.mode === "search" ? request.startDate : request.date,
  );
  const end = dateParts(
    request.mode === "search" ? request.endDate : request.date,
  );
  const keypressCounts = request.profile.keypresses.reduce(
    (mask, enabled, index) => mask | (enabled ? 1 << index : 0),
    0,
  );
  let flags = 0;
  if (request.mode === "search") {
    if (request.usePID) flags |= 1;
    if (request.useXOR) flags |= 2;
    if (request.useTID) flags |= 4;
    if (request.useSID) flags |= 8;
  }
  const values = [
    request.mode === "search" ? 0 : 1,
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
    keypressCounts,
    request.profile.skipLR ? 1 : 0,
    request.maxAdvances,
    request.resultLimit,
    ...start,
    ...end,
    request.mode === "seedFinder" ? request.hour : 0,
    request.mode === "seedFinder" ? request.minute : 0,
    request.mode === "seedFinder" ? request.minSecond : 0,
    request.mode === "seedFinder" ? request.maxSecond : 59,
    request.mode === "search" ? request.pid : 0,
    flags,
    request.tid,
    request.mode === "search" ? request.sid : 0,
    chunk.startUnit,
    chunk.unitCount,
  ];
  if (values.length !== REQUEST_WORDS)
    throw new Error("Gen 5 ID request packing changed unexpectedly.");
  words.set(values.map((value) => value >>> 0));
  return words;
}

function processedCount(module: Gen5IdEmscriptenModule) {
  return (
    module._gen5id_processed_high() * 0x1_0000_0000 +
    module._gen5id_processed_low()
  );
}

async function initialize(
  message: Extract<Gen5IdWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5id" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_ID_API_VERSION
  ) {
    throw new Error("Gen 5 ID Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 ID Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5id_api_version();
  if (apiVersion !== GEN5_ID_API_VERSION)
    throw new Error(`Gen 5 ID Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: "gen5id",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function search(message: Extract<Gen5IdWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen 5 ID Wasm module is not initialized.");
  const expectedOperation =
    message.request.mode === "search" ? "searcher" : "generator";
  if (
    message.moduleId !== "gen5id" ||
    message.apiVersion !== GEN5_ID_API_VERSION ||
    message.operation !== expectedOperation ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0 ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.startUnit) ||
    !Number.isInteger(message.chunk.unitCount) ||
    message.chunk.startUnit < 0 ||
    message.chunk.unitCount < 1
  ) {
    throw new TypeError("Invalid Gen 5 ID Worker task.");
  }
  validateGen5IdRequest(message.request);
  const request = packRequest(message.request, message.chunk);
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0) throw new Error("Gen 5 ID Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 ID Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Gen 5 ID Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);

    const startedAt = performance.now();
    const resultCount = wasm._gen5id_search(requestPointer);
    const error = wasm._gen5id_last_error();
    if (error !== 0) throw new Error(`Gen 5 ID Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5id_result_count()
    ) {
      throw new Error("Gen 5 ID Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen5id_result_ptr();
    const byteLength =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 5 ID Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    const processed = processedCount(wasm);
    const secondsPerUnit =
      message.request.mode === "search"
        ? 86_400
        : message.request.maxSecond - message.request.minSecond + 1;
    const chunkCandidates = message.chunk.unitCount * secondsPerUnit;
    const limitReached = wasm._gen5id_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > chunkCandidates ||
      (!limitReached && processed !== chunkCandidates)
    )
      throw new Error("Gen 5 ID Wasm returned an invalid processed count.");
    post(
      {
        type: "batch",
        moduleId: "gen5id",
        apiVersion: GEN5_ID_API_VERSION,
        taskId: message.taskId,
        operation: expectedOperation,
        chunkIndex: message.chunkIndex,
        processedCount: processed,
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

scope.onmessage = async ({ data }: MessageEvent<Gen5IdWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5id",
      apiVersion: GEN5_ID_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
