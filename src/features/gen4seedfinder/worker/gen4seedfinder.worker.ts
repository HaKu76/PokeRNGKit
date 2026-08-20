/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_SEED_FINDER_API_VERSION,
  gameToWasm,
  packGen4SeedFinderFilter,
  validateGen4SeedFinderRequest,
} from "../domain";
import type {
  Gen4SeedFinderWorkerRequest,
  Gen4SeedFinderWorkerResponse,
} from "./messages";

interface Gen4SeedFinderWasm {
  HEAPU32: Uint32Array;
  _gen4seedfinder_api_version(): number;
  _gen4seedfinder_search(
    game: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    minSecond: number,
    maxSecond: number,
    minDelay: number,
    maxDelay: number,
    filterLow: number,
    filterHigh: number,
    filterLength: number,
    sequenceCount: number,
  ): number;
  _gen4seedfinder_result_ptr(): number;
  _gen4seedfinder_result_count(): number;
  _gen4seedfinder_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4SeedFinderWasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4SeedFinderWasm | undefined;
function post(
  message: Gen4SeedFinderWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4SeedFinderWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4seedfinder" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_SEED_FINDER_API_VERSION
  )
    throw new Error("Gen IV Seed Finder Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen IV Seed Finder Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4seedfinder_api_version();
  if (apiVersion !== GEN4_SEED_FINDER_API_VERSION)
    throw new Error(
      `Gen IV Seed Finder Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen4seedfinder",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function search(
  message: Extract<Gen4SeedFinderWorkerRequest, { type: "task" }>,
) {
  if (!wasm)
    throw new Error("Gen IV Seed Finder Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4seedfinder" ||
    message.apiVersion !== GEN4_SEED_FINDER_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunkIndex !== 0 ||
    validateGen4SeedFinderRequest(message.request).length
  )
    throw new Error("Gen IV Seed Finder task contract mismatch.");
  const packed = packGen4SeedFinderFilter(
    message.request.filter,
    message.request.game,
  );
  const startedAt = performance.now();
  const resultCount = wasm._gen4seedfinder_search(
    gameToWasm(message.request.game),
    message.request.year,
    message.request.month,
    message.request.day,
    message.request.hour,
    message.request.minute,
    message.request.minSecond,
    message.request.maxSecond,
    message.request.minDelay,
    message.request.maxDelay,
    packed.low,
    packed.high,
    packed.length,
    message.request.sequenceCount,
  );
  const errorCode = wasm._gen4seedfinder_last_error();
  if (errorCode !== 0)
    throw new Error(`Gen IV Seed Finder Wasm returned error ${errorCode}.`);
  if (resultCount !== wasm._gen4seedfinder_result_count())
    throw new Error("Gen IV Seed Finder result count changed before copy.");
  const pointer = wasm._gen4seedfinder_result_ptr();
  if (
    (resultCount > 0 && pointer === 0) ||
    pointer % 4 !== 0 ||
    pointer / 4 + resultCount * 10 > wasm.HEAPU32.length
  )
    throw new RangeError(
      "Gen IV Seed Finder Wasm returned an invalid result range.",
    );
  const results = wasm.HEAPU32.slice(
    pointer / 4,
    pointer / 4 + resultCount * 10,
  );
  post(
    {
      type: "batch",
      moduleId: "gen4seedfinder",
      apiVersion: GEN4_SEED_FINDER_API_VERSION,
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
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen4SeedFinderWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4seedfinder",
      apiVersion: GEN4_SEED_FINDER_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
