/// <reference lib="webworker" />
import { GEN7_EGG_SEED_FINDER_API_VERSION } from "../domain";
import type {
  Gen7EggSeedWorkerRequest,
  Gen7EggSeedWorkerResponse,
} from "./messages";

interface Gen7EggSeedFinderWasm {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _gen7eggseedfinder_api_version(): number;
  _gen7eggseedfinder_search(
    startSeed: number,
    endSeed: number,
    natureList: number,
    shinyCharm: number,
  ): number;
  _gen7eggseedfinder_result_ptr(): number;
  _gen7eggseedfinder_result_count(): number;
  _gen7eggseedfinder_magikarp(bits: number, length: number): number;
  _gen7eggseedfinder_magikarp_result_ptr(): number;
  _gen7eggseedfinder_last_error(): number;
  _malloc(size: number): number;
  _free(pointer: number): void;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen7EggSeedFinderWasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7EggSeedFinderWasm | undefined;
function post(
  message: Gen7EggSeedWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 7 Egg Seed Finder Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen7eggseedfinder_api_version();
  if (apiVersion !== GEN7_EGG_SEED_FINDER_API_VERSION)
    throw new Error(
      `Gen 7 Egg Seed Finder Wasm API ${apiVersion} does not match UI API ${GEN7_EGG_SEED_FINDER_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}
function runSearch(
  message: Extract<Gen7EggSeedWorkerRequest, { type: "search" }>,
) {
  if (!wasm) throw new Error("Gen 7 Egg Seed Finder Wasm is not initialized.");
  const pointer = wasm._malloc(8 * 4);
  if (pointer === 0)
    throw new Error("Gen 7 Egg Seed Finder could not allocate Wasm memory.");
  const startedAt = performance.now();
  let count: number;
  try {
    new Uint32Array(wasm.HEAPU32.buffer, pointer, 8).set(
      message.request.natureList,
    );
    count = wasm._gen7eggseedfinder_search(
      message.chunk.startSeed,
      message.chunk.endSeed,
      pointer,
      message.request.shinyCharm ? 1 : 0,
    );
  } finally {
    wasm._free(pointer);
  }
  if (wasm._gen7eggseedfinder_last_error() !== 0)
    throw new Error("Gen 7 Egg Seed Finder Wasm search failed.");
  const actualCount = wasm._gen7eggseedfinder_result_count();
  if (actualCount !== count)
    throw new Error(
      "Gen 7 Egg Seed Finder returned an inconsistent result count.",
    );
  const resultPointer = wasm._gen7eggseedfinder_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(
    resultPointer,
    resultPointer + actualCount * 4,
  );
  const buffer = words.buffer;
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.endSeed - message.chunk.startSeed + 1,
      resultCount: actualCount,
      elapsedMs: performance.now() - startedAt,
      buffer,
    },
    [buffer],
  );
}
function runMagikarp(
  message: Extract<Gen7EggSeedWorkerRequest, { type: "magikarp" }>,
) {
  if (!wasm) throw new Error("Gen 7 Egg Seed Finder Wasm is not initialized.");
  const bits = new Uint8Array(message.bits);
  const pointer = wasm._malloc(bits.byteLength);
  if (pointer === 0)
    throw new Error("Gen 7 Egg Seed Finder could not allocate Wasm memory.");
  try {
    wasm.HEAPU8.set(bits, pointer);
    wasm._gen7eggseedfinder_magikarp(pointer, bits.byteLength);
  } finally {
    wasm._free(pointer);
  }
  if (wasm._gen7eggseedfinder_last_error() !== 0)
    throw new Error("Gen 7 Egg Seed Finder Magikarp calculation failed.");
  const resultPointer = wasm._gen7eggseedfinder_magikarp_result_ptr() >>> 2;
  const buffer = wasm.HEAPU32.slice(resultPointer, resultPointer + 4).buffer;
  post({ type: "magikarp", taskId: message.taskId, buffer }, [buffer]);
}
scope.onmessage = async ({ data }: MessageEvent<Gen7EggSeedWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else if (data.type === "search") runSearch(data);
    else runMagikarp(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
