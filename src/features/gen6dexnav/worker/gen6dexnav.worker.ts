/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6DexNavRequest,
  GEN6_DEXNAV_API_VERSION,
  GEN6_DEXNAV_REQUEST_WORDS,
  GEN6_DEXNAV_RESULT_WORDS,
  validateGen6DexNavRequest,
} from "../domain";
import type {
  Gen6DexNavWorkerRequest,
  Gen6DexNavWorkerResponse,
} from "./messages";
interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6dexnav_api_version(): number;
  _gen6dexnav_generate(pointer: number): number;
  _gen6dexnav_result_ptr(): number;
  _gen6dexnav_result_count(): number;
  _gen6dexnav_processed_count(): number;
  _gen6dexnav_limit_reached(): number;
  _gen6dexnav_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;
function post(
  message: Gen6DexNavWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function initialize(
  message: Extract<Gen6DexNavWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6dexnav" ||
    message.apiVersion !== GEN6_DEXNAV_API_VERSION ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION
  )
    throw new Error("Gen VI DexNav Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen VI DexNav Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6dexnav_api_version() !== GEN6_DEXNAV_API_VERSION)
    throw new Error("Gen VI DexNav Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6dexnav",
    apiVersion: GEN6_DEXNAV_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}
function generate(message: Extract<Gen6DexNavWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen VI DexNav Wasm is not initialized.");
  validateGen6DexNavRequest(message.request);
  const request = encodeGen6DexNavRequest(message.request);
  if (request.length !== GEN6_DEXNAV_REQUEST_WORDS)
    throw new Error("Gen VI DexNav request packing changed unexpectedly.");
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI DexNav Wasm allocation failed.");
  try {
    wasm.HEAPU32.set(request, pointer >>> 2);
    const resultCount = wasm._gen6dexnav_generate(pointer);
    if (
      wasm._gen6dexnav_last_error() !== 0 ||
      resultCount !== wasm._gen6dexnav_result_count()
    )
      throw new Error("Gen VI DexNav Wasm returned an error.");
    const resultPointer = wasm._gen6dexnav_result_ptr();
    const wordLength = resultCount * GEN6_DEXNAV_RESULT_WORDS;
    if (
      resultCount !== 0 &&
      (!resultPointer ||
        resultPointer % 4 !== 0 ||
        resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength)
    )
      throw new Error("Gen VI DexNav Wasm returned an invalid result pointer.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    post(
      {
        type: "batch",
        moduleId: "gen6dexnav",
        apiVersion: GEN6_DEXNAV_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount: wasm._gen6dexnav_processed_count(),
        resultCount,
        limitReached: wasm._gen6dexnav_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}
scope.onmessage = async ({ data }: MessageEvent<Gen6DexNavWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6dexnav",
      apiVersion: GEN6_DEXNAV_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
