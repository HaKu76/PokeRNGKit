/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  gameToWasm,
  packGen4SwarmAdvanceRequest,
  packGen4SwarmSeedRequest,
  validateGen4SwarmRequest,
  GEN4_SWARM_API_VERSION,
} from "../domain";
import type {
  Gen4SwarmWorkerRequest,
  Gen4SwarmWorkerResponse,
} from "./messages";

interface Gen4SwarmWasm {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen4swarm_api_version(): number;
  _gen4swarm_find_advances(
    game: number,
    seed: number,
    target: number,
    min: number,
    max: number,
  ): number;
  _gen4swarm_find_seed(
    game: number,
    target: number,
    minDelay: number,
    minHour: number,
    mtAdvances: number,
  ): number;
  _gen4swarm_result_ptr(): number;
  _gen4swarm_result_count(): number;
  _gen4swarm_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4SwarmWasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4SwarmWasm | undefined;

function post(message: Gen4SwarmWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4SwarmWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4swarm" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_SWARM_API_VERSION
  )
    throw new Error("Gen IV Swarm Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen IV Swarm Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4swarm_api_version();
  if (apiVersion !== GEN4_SWARM_API_VERSION)
    throw new Error(
      `Gen IV Swarm Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen4swarm",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function search(message: Extract<Gen4SwarmWorkerRequest, { type: "task" }>) {
  const currentWasm = wasm;
  if (!currentWasm)
    throw new Error("Gen IV Swarm Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4swarm" ||
    message.apiVersion !== GEN4_SWARM_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunkIndex !== 0 ||
    message.chunk.index !== 0 ||
    message.chunk.stateCount !== 1 ||
    validateGen4SwarmRequest(message.request).length > 0
  )
    throw new Error("Gen IV Swarm task contract mismatch.");
  const packed =
    message.request.mode === "advances"
      ? packGen4SwarmAdvanceRequest(message.request)
      : packGen4SwarmSeedRequest(message.request);
  const pointer = currentWasm._malloc(packed.byteLength);
  try {
    if (
      !Number.isInteger(pointer) ||
      pointer <= 0 ||
      pointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      pointer / Uint32Array.BYTES_PER_ELEMENT + packed.length >
        currentWasm.HEAPU32.length
    )
      throw new RangeError(
        "Gen IV Swarm Wasm could not allocate request buffer.",
      );
    currentWasm.HEAPU32.set(packed, pointer >>> 2);
    const startedAt = performance.now();
    const resultCount =
      message.request.mode === "advances"
        ? currentWasm._gen4swarm_find_advances(
            gameToWasm(message.request.game),
            message.request.seed,
            message.request.targetIndex,
            message.request.minAdvance,
            message.request.maxAdvance,
          )
        : currentWasm._gen4swarm_find_seed(
            gameToWasm(message.request.game),
            message.request.targetIndex,
            message.request.minDelay,
            message.request.minHour,
            message.request.mtAdvances,
          );
    if (currentWasm._gen4swarm_last_error() !== 0)
      throw new Error(
        `Gen IV Swarm Wasm returned error ${currentWasm._gen4swarm_last_error()}.`,
      );
    if (resultCount !== currentWasm._gen4swarm_result_count())
      throw new Error("Gen IV Swarm Wasm result count changed before copy.");
    const wordsPerResult = message.request.mode === "advances" ? 2 : 4;
    const resultPointer = currentWasm._gen4swarm_result_ptr();
    if (
      !Number.isInteger(resultPointer) ||
      resultPointer < 0 ||
      resultPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      (resultCount > 0 && resultPointer === 0) ||
      resultPointer / Uint32Array.BYTES_PER_ELEMENT +
        resultCount * wordsPerResult >
        currentWasm.HEAPU32.length
    )
      throw new RangeError(
        "Gen IV Swarm Wasm returned an invalid result range.",
      );
    const results = currentWasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * wordsPerResult,
    );
    post(
      {
        type: "batch",
        moduleId: "gen4swarm",
        apiVersion: GEN4_SWARM_API_VERSION,
        taskId: message.taskId,
        operation: "searcher",
        chunkIndex: 0,
        processedCount: 1,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: results.buffer,
      },
      [results.buffer],
    );
  } finally {
    currentWasm._free(pointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen4SwarmWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4swarm",
      apiVersion: GEN4_SWARM_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
