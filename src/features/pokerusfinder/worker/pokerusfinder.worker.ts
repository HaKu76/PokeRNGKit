/// <reference lib="webworker" />

import {
  POKERUS_FINDER_API_VERSION,
  validatePokerusGen3Request,
  validatePokerusPtHgssRequest,
} from "../domain";
import type { PokerusGen3Request, PokerusPtHgssRequest } from "../domain";
import type {
  PokerusFinderWorkerRequest,
  PokerusFinderWorkerResponse,
} from "./messages";

interface PokerusFinderModule {
  HEAPU32: Uint32Array;
  _pokerusfinder_api_version(): number;
  _pokerusfinder_search_gen3(
    seed: number,
    frame: number,
    delay: number,
    maxFrames: number,
  ): number;
  _pokerusfinder_search_pthgss(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
  ): number;
  _pokerusfinder_result_ptr(): number;
  _pokerusfinder_result_count(): number;
  _pokerusfinder_last_error(): number;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<PokerusFinderModule>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: PokerusFinderModule | undefined;

function post(
  message: PokerusFinderWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Pokerus Finder Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._pokerusfinder_api_version();
  if (apiVersion !== POKERUS_FINDER_API_VERSION)
    throw new Error("Pokerus Finder Wasm API version mismatch.");
  post({ type: "ready", apiVersion });
}

function run(
  message: Extract<
    PokerusFinderWorkerRequest,
    { type: "run-gen3" | "run-pthgss" }
  >,
) {
  if (!wasm) throw new Error("Pokerus Finder Wasm module is not initialized.");
  const requestErrors =
    message.type === "run-gen3"
      ? validatePokerusGen3Request(message.request as PokerusGen3Request)
      : validatePokerusPtHgssRequest(message.request as PokerusPtHgssRequest);
  if (requestErrors.length > 0)
    throw new RangeError("Pokerus Finder Worker received an invalid request.");
  const startedAt = performance.now();
  const count =
    message.type === "run-gen3"
      ? wasm._pokerusfinder_search_gen3(
          (message.request as PokerusGen3Request).seed,
          (message.request as PokerusGen3Request).frame,
          (message.request as PokerusGen3Request).delay,
          (message.request as PokerusGen3Request).maxFrames,
        )
      : wasm._pokerusfinder_search_pthgss(
          (message.request as PokerusPtHgssRequest).year,
          (message.request as PokerusPtHgssRequest).month,
          (message.request as PokerusPtHgssRequest).day,
          (message.request as PokerusPtHgssRequest).hour,
          (message.request as PokerusPtHgssRequest).minute,
        );
  if (wasm._pokerusfinder_last_error() !== 0)
    throw new Error("Pokerus Finder Wasm core rejected the request.");
  if (count !== wasm._pokerusfinder_result_count())
    throw new Error("Pokerus Finder result count changed before copying.");
  const hasDelay = message.type === "run-pthgss";
  const wordsPerState = hasDelay ? 4 : 2;
  const pointer = wasm._pokerusfinder_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(pointer, pointer + count * wordsPerState);
  const total =
    message.type === "run-gen3"
      ? (message.request as PokerusGen3Request).maxFrames
      : 60 * 401 * 101;
  post(
    {
      type: "batch",
      taskId: message.taskId,
      resultCount: count,
      processed: total,
      total,
      elapsedMs: performance.now() - startedAt,
      hasDelay,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

scope.onmessage = async ({
  data,
}: MessageEvent<PokerusFinderWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      code: "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
