/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6PokeRadarRequest,
  GEN6_POKERADAR_API_VERSION,
  GEN6_POKERADAR_REQUEST_WORDS,
  GEN6_POKERADAR_RESULT_WORDS,
  validateGen6PokeRadarRequest,
} from "../domain";
import type {
  Gen6PokeRadarWorkerRequest,
  Gen6PokeRadarWorkerResponse,
} from "./messages";
interface Wasm {
  HEAPU32: Uint32Array;
  _malloc(n: number): number;
  _free(p: number): void;
  _gen6pokeradar_api_version(): number;
  _gen6pokeradar_generate(p: number): number;
  _gen6pokeradar_result_ptr(): number;
  _gen6pokeradar_result_count(): number;
  _gen6pokeradar_processed_count(): number;
  _gen6pokeradar_limit_reached(): number;
  _gen6pokeradar_last_error(): number;
}
type Factory = (options: { locateFile(file: string): string }) => Promise<Wasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Wasm | undefined;
function post(
  message: Gen6PokeRadarWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function init(
  message: Extract<Gen6PokeRadarWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6pokeradar" ||
    message.apiVersion !== GEN6_POKERADAR_API_VERSION ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION
  )
    throw new Error("Gen VI Poke Radar Worker contract mismatch.");
  const ns = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof ns.default !== "function")
    throw new TypeError(
      "Gen VI Poke Radar Wasm module has no default factory.",
    );
  wasm = await ns.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6pokeradar_api_version() !== GEN6_POKERADAR_API_VERSION)
    throw new Error("Gen VI Poke Radar Wasm API version mismatch.");
  post({
    type: "ready",
    moduleId: "gen6pokeradar",
    apiVersion: GEN6_POKERADAR_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["generator"],
  });
}
function generate(
  message: Extract<Gen6PokeRadarWorkerRequest, { type: "task" }>,
) {
  if (!wasm) throw new Error("Gen VI Poke Radar Wasm is not initialized.");
  validateGen6PokeRadarRequest(message.request);
  const request = encodeGen6PokeRadarRequest(message.request);
  if (request.length !== GEN6_POKERADAR_REQUEST_WORDS)
    throw new Error("Gen VI Poke Radar request packing changed unexpectedly.");
  const pointer = wasm._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI Poke Radar Wasm allocation failed.");
  try {
    wasm.HEAPU32.set(request, pointer >>> 2);
    const count = wasm._gen6pokeradar_generate(pointer);
    if (
      wasm._gen6pokeradar_last_error() !== 0 ||
      count !== wasm._gen6pokeradar_result_count()
    )
      throw new Error("Gen VI Poke Radar Wasm returned an error.");
    const resultPointer = wasm._gen6pokeradar_result_ptr(),
      length = count * GEN6_POKERADAR_RESULT_WORDS;
    if (
      count &&
      (!resultPointer ||
        resultPointer % 4 ||
        resultPointer + length * 4 > wasm.HEAPU32.byteLength)
    )
      throw new Error(
        "Gen VI Poke Radar Wasm returned an invalid result pointer.",
      );
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + length,
    );
    post(
      {
        type: "batch",
        moduleId: "gen6pokeradar",
        apiVersion: GEN6_POKERADAR_API_VERSION,
        taskId: message.taskId,
        buffer: copied.buffer,
        processedCount: wasm._gen6pokeradar_processed_count(),
        resultCount: count,
        limitReached: wasm._gen6pokeradar_limit_reached() === 1,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}
scope.onmessage = async ({
  data,
}: MessageEvent<Gen6PokeRadarWorkerRequest>) => {
  try {
    if (data.type === "init") await init(data);
    else generate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6pokeradar",
      apiVersion: GEN6_POKERADAR_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
