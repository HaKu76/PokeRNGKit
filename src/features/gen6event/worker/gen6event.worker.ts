/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6EventRequest,
  GEN6_EVENT_API_VERSION,
  GEN6_EVENT_REQUEST_WORDS,
  GEN6_EVENT_RESULT_WORDS,
  validateGen6EventRequest,
} from "../domain";
import type {
  Gen6EventWorkerRequest,
  Gen6EventWorkerResponse,
} from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6event_api_version(): number;
  _gen6event_generate(pointer: number): number;
  _gen6event_result_ptr(): number;
  _gen6event_result_count(): number;
  _gen6event_processed_count(): number;
  _gen6event_limit_reached(): number;
  _gen6event_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: WasmModule | undefined;

function post(message: Gen6EventWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6EventWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6event" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_EVENT_API_VERSION
  )
    throw new Error("Gen VI Event Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen VI Event Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6event_api_version() !== GEN6_EVENT_API_VERSION)
    throw new Error("Gen VI Event Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6event",
    apiVersion: GEN6_EVENT_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function generate(message: Extract<Gen6EventWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen VI Event Wasm module is not initialized.");
  validateGen6EventRequest(message.request);
  const request = encodeGen6EventRequest(message.request);
  if (request.length !== GEN6_EVENT_REQUEST_WORDS)
    throw new Error("Gen VI Event request packing changed unexpectedly.");
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Event Wasm allocation failed.");
  try {
    if (
      (pointer & 3) !== 0 ||
      pointer + request.byteLength > wasm.HEAPU32.byteLength
    )
      throw new RangeError("Gen VI Event request pointer is invalid.");
    wasm.HEAPU32.set(request, pointer >>> 2);
    const resultCount = wasm._gen6event_generate(pointer);
    if (
      wasm._gen6event_last_error() !== 0 ||
      resultCount !== wasm._gen6event_result_count()
    )
      throw new Error("Gen VI Event Wasm returned an error.");
    const resultPointer = wasm._gen6event_result_ptr();
    const wordLength = resultCount * GEN6_EVENT_RESULT_WORDS;
    if (
      resultCount &&
      (!resultPointer ||
        resultPointer + wordLength * 4 > wasm.HEAPU32.byteLength)
    )
      throw new RangeError("Gen VI Event result pointer is invalid.");
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + wordLength,
    );
    const processedCount = wasm._gen6event_processed_count();
    post(
      {
        type: "batch",
        moduleId: "gen6event",
        apiVersion: GEN6_EVENT_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount,
        resultCount,
        limitReached: wasm._gen6event_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen6EventWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6event",
      apiVersion: GEN6_EVENT_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
