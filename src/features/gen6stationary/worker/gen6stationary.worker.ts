/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6StationaryRequest,
  GEN6_STATIONARY_API_VERSION,
  GEN6_STATIONARY_REQUEST_WORDS,
  GEN6_STATIONARY_RESULT_WORDS,
  validateGen6StationaryRequest,
} from "../domain";
import type {
  Gen6StationaryWorkerRequest,
  Gen6StationaryWorkerResponse,
} from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6stationary_api_version(): number;
  _gen6stationary_generate(pointer: number): number;
  _gen6stationary_result_ptr(): number;
  _gen6stationary_result_count(): number;
  _gen6stationary_processed_count(): number;
  _gen6stationary_limit_reached(): number;
  _gen6stationary_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;
function post(
  message: Gen6StationaryWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function initialize(
  message: Extract<Gen6StationaryWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6stationary" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_STATIONARY_API_VERSION
  )
    throw new Error("Gen VI Stationary Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen VI Stationary Wasm module has no default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6stationary_api_version() !== GEN6_STATIONARY_API_VERSION)
    throw new Error("Gen VI Stationary Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6stationary",
    apiVersion: GEN6_STATIONARY_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}
function generate(
  message: Extract<Gen6StationaryWorkerRequest, { type: "task" }>,
) {
  if (!wasm)
    throw new Error("Gen VI Stationary Wasm module is not initialized.");
  validateGen6StationaryRequest(message.request);
  const request = encodeGen6StationaryRequest(message.request);
  if (request.length !== GEN6_STATIONARY_REQUEST_WORDS)
    throw new Error("Gen VI Stationary request packing changed unexpectedly.");
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Stationary Wasm allocation failed.");
  try {
    if (
      (pointer & 3) !== 0 ||
      pointer + request.byteLength > wasm.HEAPU32.byteLength
    )
      throw new RangeError("Gen VI Stationary request pointer is invalid.");
    wasm.HEAPU32.set(request, pointer >>> 2);
    const resultCount = wasm._gen6stationary_generate(pointer);
    if (
      wasm._gen6stationary_last_error() !== 0 ||
      resultCount !== wasm._gen6stationary_result_count()
    )
      throw new Error("Gen VI Stationary Wasm returned an error.");
    const resultPointer = wasm._gen6stationary_result_ptr();
    const wordLength = resultCount * GEN6_STATIONARY_RESULT_WORDS;
    if (
      resultCount &&
      (!resultPointer ||
        resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength)
    )
      throw new RangeError("Gen VI Stationary result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    const processedCount = wasm._gen6stationary_processed_count();
    post(
      {
        type: "batch",
        moduleId: "gen6stationary",
        apiVersion: GEN6_STATIONARY_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount,
        resultCount,
        limitReached: wasm._gen6stationary_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}
scope.onmessage = async ({
  data,
}: MessageEvent<Gen6StationaryWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6stationary",
      apiVersion: GEN6_STATIONARY_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
