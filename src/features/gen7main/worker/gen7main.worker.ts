/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN7_MAIN_API_VERSION,
  gen7MainSeedOffset,
  validateGen7MainQrRequest,
  validateGen7MainSeedRequest,
  validateGen7MainTimeRequest,
} from "../domain";
import type {
  Gen7MainWorkerRequest,
  Gen7MainWorkerResponse,
  Gen7MainWorkerTask,
} from "./messages";

interface Gen7MainEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7main_api_version(): number;
  _gen7main_search_seed(
    startSeed: number,
    seedCount: number,
    offset: number,
    needlePointer: number,
    needleCount: number,
    fuzzy: number,
  ): number;
  _gen7main_seed_result_ptr(): number;
  _gen7main_seed_result_count(): number;
  _gen7main_qr_search(
    seed: number,
    minimumFrame: number,
    maximumFrame: number,
    needlePointer: number,
    needleCount: number,
  ): number;
  _gen7main_qr_result_ptr(): number;
  _gen7main_qr_result_count(): number;
  _gen7main_calculate_time(
    seed: number,
    startingFrame: number,
    targetFrame: number,
    npc: number,
    fidget: number,
    raining: number,
  ): number;
  _gen7main_time_primary(): number;
  _gen7main_time_secondary(): number;
  _gen7main_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen7MainEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7MainEmscriptenModule | undefined;

function post(message: Gen7MainWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

function copyWords(pointer: number, wordCount: number) {
  if (!wasm) throw new Error("Gen 7 Main RNG Wasm is unavailable.");
  const byteLength = wordCount * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (wordCount !== 0 && pointer === 0) ||
    (pointer & 3) !== 0 ||
    pointer < 0 ||
    pointer + byteLength > wasm.HEAPU32.byteLength
  )
    throw new RangeError("Gen 7 Main Wasm result pointer is invalid.");
  return wasm.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + wordCount);
}

async function initialize(
  message: Extract<Gen7MainWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7main" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_MAIN_API_VERSION
  )
    throw new Error("Gen 7 Main RNG Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 7 Main Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen7main_api_version() !== GEN7_MAIN_API_VERSION)
    throw new Error("Gen 7 Main Wasm API does not match the UI.");
  post({
    type: "ready",
    moduleId: "gen7main",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_MAIN_API_VERSION,
    operations: ["seed-search", "qr-search", "time-calculator"],
  });
}

function allocateNeedles(needles: number[]) {
  if (!wasm) throw new Error("Gen 7 Main RNG Wasm is unavailable.");
  const packed = new Uint32Array(needles);
  const pointer = wasm._malloc(packed.byteLength);
  if (pointer === 0) throw new Error("Gen 7 Main Wasm allocation failed.");
  if (
    (pointer & 3) !== 0 ||
    pointer + packed.byteLength > wasm.HEAPU32.byteLength
  ) {
    wasm._free(pointer);
    throw new RangeError("Gen 7 Main Wasm request pointer is invalid.");
  }
  wasm.HEAPU32.set(packed, pointer >>> 2);
  return pointer;
}

function runSeed(
  message: Extract<Gen7MainWorkerTask, { operation: "seed-search" }>,
) {
  if (!wasm) throw new Error("Gen 7 Main RNG Wasm is not initialized.");
  validateGen7MainSeedRequest(message.request);
  const pointer = allocateNeedles(message.request.needles);
  try {
    const resultCount = wasm._gen7main_search_seed(
      message.chunk.startSeed,
      message.chunk.seedCount,
      gen7MainSeedOffset(message.request.version, message.request.mode),
      pointer,
      message.request.needles.length,
      message.request.mode === "id" ? 1 : 0,
    );
    if (wasm._gen7main_last_error() !== 0)
      throw new Error(`Gen 7 Main Wasm error ${wasm._gen7main_last_error()}.`);
    const copied = copyWords(
      resultCount === 0 ? 0 : wasm._gen7main_seed_result_ptr(),
      resultCount * 2,
    );
    post(
      {
        type: "seed-batch",
        moduleId: "gen7main",
        apiVersion: GEN7_MAIN_API_VERSION,
        taskId: message.taskId,
        operation: "seed-search",
        chunkIndex: message.chunkIndex,
        buffer: copied.buffer,
        processedSeeds: message.chunk.seedCount,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

function runQr(
  message: Extract<Gen7MainWorkerTask, { operation: "qr-search" }>,
) {
  if (!wasm) throw new Error("Gen 7 Main RNG Wasm is not initialized.");
  validateGen7MainQrRequest(message.request);
  const pointer = allocateNeedles(message.request.needles);
  try {
    const resultCount = wasm._gen7main_qr_search(
      message.request.seed,
      message.request.minFrame,
      message.request.maxFrame,
      pointer,
      message.request.needles.length,
    );
    if (wasm._gen7main_last_error() !== 0)
      throw new Error(`Gen 7 Main Wasm error ${wasm._gen7main_last_error()}.`);
    const copied = copyWords(
      resultCount === 0 ? 0 : wasm._gen7main_qr_result_ptr(),
      resultCount * 2,
    );
    post(
      {
        type: "qr-result",
        moduleId: "gen7main",
        apiVersion: GEN7_MAIN_API_VERSION,
        taskId: message.taskId,
        operation: "qr-search",
        buffer: copied.buffer,
        resultCount,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

function runTime(
  message: Extract<Gen7MainWorkerTask, { operation: "time-calculator" }>,
) {
  if (!wasm) throw new Error("Gen 7 Main RNG Wasm is not initialized.");
  validateGen7MainTimeRequest(message.request);
  if (
    wasm._gen7main_calculate_time(
      message.request.seed,
      message.request.startingFrame,
      message.request.targetFrame,
      message.request.npc,
      message.request.fidget ? 1 : 0,
      message.request.raining ? 1 : 0,
    ) !== 1
  )
    throw new Error(`Gen 7 Main Wasm error ${wasm._gen7main_last_error()}.`);
  post({
    type: "time-result",
    moduleId: "gen7main",
    apiVersion: GEN7_MAIN_API_VERSION,
    taskId: message.taskId,
    operation: "time-calculator",
    primaryFrames: wasm._gen7main_time_primary(),
    secondaryFrames: wasm._gen7main_time_secondary(),
  });
}

async function handle(message: Gen7MainWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else if (message.operation === "seed-search") runSeed(message);
    else if (message.operation === "qr-search") runQr(message);
    else runTime(message);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen7main",
      apiVersion: GEN7_MAIN_API_VERSION,
      taskId: message.type === "task" ? message.taskId : undefined,
      chunkIndex:
        message.type === "task" && message.operation === "seed-search"
          ? message.chunkIndex
          : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7MainWorkerRequest>) =>
  void handle(data);
