/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6TinyTimelineRequest,
  GEN6_TINYTIMELINE_API_VERSION,
  GEN6_TINYTIMELINE_REQUEST_WORDS,
  GEN6_TINYTIMELINE_RESULT_WORDS,
  validateGen6TinyTimelineRequest,
} from "../domain";
import type {
  Gen6TinyTimelineWorkerRequest,
  Gen6TinyTimelineWorkerResponse,
} from "./messages";

interface Wasm {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6tinytimeline_api_version(): number;
  _gen6tinytimeline_generate(pointer: number): number;
  _gen6tinytimeline_result_ptr(): number;
  _gen6tinytimeline_result_count(): number;
  _gen6tinytimeline_processed_count(): number;
  _gen6tinytimeline_limit_reached(): number;
  _gen6tinytimeline_last_error(): number;
}
type Factory = (options: { locateFile(file: string): string }) => Promise<Wasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Wasm | undefined;

function post(
  message: Gen6TinyTimelineWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen6TinyTimelineWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6tinytimeline" ||
    message.apiVersion !== GEN6_TINYTIMELINE_API_VERSION ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION
  )
    throw new Error("Gen VI Tiny Timeline Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError(
      "Gen VI Tiny Timeline Wasm module has no default factory.",
    );
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6tinytimeline_api_version() !== GEN6_TINYTIMELINE_API_VERSION)
    throw new Error("Gen VI Tiny Timeline Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6tinytimeline",
    apiVersion: GEN6_TINYTIMELINE_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}

function generate(
  message: Extract<Gen6TinyTimelineWorkerRequest, { type: "task" }>,
) {
  if (!wasm) throw new Error("Gen VI Tiny Timeline Wasm is not initialized.");
  validateGen6TinyTimelineRequest(message.request);
  const request = encodeGen6TinyTimelineRequest(message.request);
  if (request.length !== GEN6_TINYTIMELINE_REQUEST_WORDS)
    throw new Error(
      "Gen VI Tiny Timeline request packing changed unexpectedly.",
    );
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Tiny Timeline Wasm allocation failed.");
  try {
    wasm.HEAPU32.set(request, pointer >>> 2);
    const count = wasm._gen6tinytimeline_generate(pointer);
    if (
      wasm._gen6tinytimeline_last_error() !== 0 ||
      count !== wasm._gen6tinytimeline_result_count()
    )
      throw new Error("Gen VI Tiny Timeline Wasm returned an error.");
    const resultPointer = wasm._gen6tinytimeline_result_ptr();
    const length = count * GEN6_TINYTIMELINE_RESULT_WORDS;
    if (
      count &&
      (!resultPointer ||
        resultPointer % 4 ||
        resultPointer + length * 4 > wasm.HEAPU32.byteLength)
    )
      throw new Error(
        "Gen VI Tiny Timeline Wasm returned an invalid result pointer.",
      );
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + length,
    );
    post(
      {
        type: "batch",
        moduleId: "gen6tinytimeline",
        apiVersion: GEN6_TINYTIMELINE_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount: wasm._gen6tinytimeline_processed_count(),
        resultCount: count,
        limitReached: wasm._gen6tinytimeline_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen6TinyTimelineWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6tinytimeline",
      apiVersion: GEN6_TINYTIMELINE_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
