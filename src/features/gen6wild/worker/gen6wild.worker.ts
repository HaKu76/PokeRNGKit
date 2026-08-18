/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6WildRequest,
  GEN6_WILD_API_VERSION,
  GEN6_WILD_REQUEST_WORDS,
  GEN6_WILD_RESULT_WORDS,
  validateGen6WildRequest,
} from "../domain";
import type { Gen6WildWorkerRequest, Gen6WildWorkerResponse } from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6wild_api_version(): number;
  _gen6wild_generate(pointer: number): number;
  _gen6wild_result_ptr(): number;
  _gen6wild_result_count(): number;
  _gen6wild_processed_count(): number;
  _gen6wild_limit_reached(): number;
  _gen6wild_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;
function post(message: Gen6WildWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6WildWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6wild" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_WILD_API_VERSION
  )
    throw new Error("Gen VI Wild Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen VI Wild Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6wild_api_version() !== GEN6_WILD_API_VERSION)
    throw new Error("Gen VI Wild Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6wild",
    apiVersion: GEN6_WILD_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen6WildWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen VI Wild Wasm is not initialized.");
  validateGen6WildRequest(message.request);
  const request = encodeGen6WildRequest(message.request);
  if (request.length !== GEN6_WILD_REQUEST_WORDS)
    throw new Error("Gen VI Wild request packing changed unexpectedly.");
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Wild Wasm allocation failed.");
  try {
    wasm.HEAPU32.set(request, pointer >>> 2);
    const resultCount = wasm._gen6wild_generate(pointer);
    if (
      wasm._gen6wild_last_error() !== 0 ||
      resultCount !== wasm._gen6wild_result_count()
    )
      throw new Error("Gen VI Wild Wasm returned an error.");
    const resultPointer = wasm._gen6wild_result_ptr();
    const wordLength = resultCount * GEN6_WILD_RESULT_WORDS;
    if (
      resultCount !== 0 &&
      (resultPointer === 0 ||
        resultPointer % 4 !== 0 ||
        resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength)
    )
      throw new Error("Gen VI Wild Wasm returned an invalid result pointer.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    post(
      {
        type: "batch",
        moduleId: "gen6wild",
        apiVersion: GEN6_WILD_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount: wasm._gen6wild_processed_count(),
        resultCount,
        limitReached: wasm._gen6wild_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen6WildWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6wild",
      apiVersion: GEN6_WILD_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
