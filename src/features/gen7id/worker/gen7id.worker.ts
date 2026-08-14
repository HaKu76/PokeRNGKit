/// <reference lib="webworker" />
import { filterGen7IdPackedStates, GEN7_ID_API_VERSION } from "../domain";
import type { Gen7IdWorkerRequest, Gen7IdWorkerResponse } from "./messages";
interface Gen7IdWasm {
  HEAPU32: Uint32Array;
  _gen7id_api_version(): number;
  _gen7id_generate(
    seed: number,
    min: number,
    max: number,
    correction: number,
    mode: number,
    value: number,
    valueDigits: number,
    tsv: number,
    randLow: number,
    randHigh: number,
    randDigits: number,
  ): number;
  _gen7id_result_ptr(): number;
  _gen7id_result_count(): number;
  _gen7id_last_error(): number;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen7IdWasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen7IdWasm | undefined;
function post(message: Gen7IdWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}
async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen7 ID Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen7id_api_version();
  if (apiVersion !== GEN7_ID_API_VERSION)
    throw new Error(
      `Gen7 ID Wasm API ${apiVersion} does not match UI API ${GEN7_ID_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}
function run(message: Extract<Gen7IdWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen7 ID Wasm module is not initialized.");
  const startedAt = performance.now();
  // IDFilters contains upstream multiline/regex semantics that belong to the
  // Worker boundary. Wasm remains responsible only for SFMT state generation.
  const generatedCount = wasm._gen7id_generate(
    message.request.seed,
    message.chunk.minAdvances,
    message.chunk.maxAdvances,
    message.request.correction,
    0,
    0,
    0,
    0xffffffff,
    0xffffffff,
    0xffffffff,
    0,
  );
  if (wasm._gen7id_last_error() !== 0)
    throw new Error("Gen7 ID Wasm core returned an error.");
  if (
    wasm._gen7id_result_count() !== generatedCount ||
    generatedCount !== message.chunk.stateCount
  )
    throw new Error("Gen7 ID Wasm core returned an inconsistent result count.");
  const pointer = wasm._gen7id_result_ptr() >>> 2;
  const generated = wasm.HEAPU32.slice(pointer, pointer + generatedCount * 8);
  const words = filterGen7IdPackedStates(generated, message.request.filters);
  const resultCount = words.length / 8;
  const buffer: ArrayBuffer =
    words.buffer instanceof ArrayBuffer
      ? words.buffer
      : new Uint32Array(words).buffer;
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer,
    },
    [buffer],
  );
}
scope.onmessage = async ({ data }: MessageEvent<Gen7IdWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "run" ? data.taskId : undefined,
      chunkIndex: data.type === "run" ? data.chunk.index : undefined,
      code: "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
