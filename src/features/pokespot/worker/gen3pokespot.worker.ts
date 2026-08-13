/// <reference lib="webworker" />

import {
  GEN3_POKE_SPOT_API_VERSION,
  GEN3_POKE_SPOT_MAX_RESULTS,
  GEN3_POKE_SPOT_RESULT_WORDS,
  pokeSpotAbilityFilterToWasm,
  pokeSpotGenderFilterToWasm,
  pokeSpotShinyFilterToWasm,
} from "../domain";
import type {
  Gen3PokeSpotWorkerRequest,
  Gen3PokeSpotWorkerResponse,
} from "./messages";

interface WasmModule {
  HEAPU32: Uint32Array;
  _gen3pokespot_api_version(): number;
  _gen3pokespot_generate(...args: number[]): number;
  _gen3pokespot_result_ptr(): number;
  _gen3pokespot_result_count(): number;
  _gen3pokespot_last_error(): number;
}
type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<WasmModule>;
let wasm: WasmModule | undefined;

function post(
  message: Gen3PokeSpotWorkerResponse,
  transfer: Transferable[] = [],
) {
  self.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen3 PokeSpot Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3pokespot_api_version();
  if (apiVersion !== GEN3_POKE_SPOT_API_VERSION)
    throw new Error(
      `Gen3 PokeSpot Wasm API ${apiVersion} does not match UI API ${GEN3_POKE_SPOT_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3PokeSpotWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 PokeSpot Wasm module is not initialized.");
  const { request } = message;
  const { filters } = request;
  const resultCount = wasm._gen3pokespot_generate(
    request.foodSeed,
    request.encounterSeed,
    message.chunk.foodInitialAdvances,
    message.chunk.foodMaxAdvances,
    request.encounterInitialAdvances,
    request.encounterMaxAdvances,
    request.foodOffset,
    request.encounterOffset,
    request.location,
    request.tid,
    request.sid,
    pokeSpotShinyFilterToWasm(filters.shiny),
    pokeSpotGenderFilterToWasm(filters.gender),
    pokeSpotAbilityFilterToWasm(filters.ability),
    filters.natureMask,
    filters.hiddenPowerMask,
    filters.slotMask,
    ...filters.ivMin,
    ...filters.ivMax,
  );
  const errorCode = wasm._gen3pokespot_last_error();
  if (errorCode !== 0 && errorCode !== 2)
    throw new Error(`Gen3 PokeSpot Wasm core returned error ${errorCode}.`);
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount > GEN3_POKE_SPOT_MAX_RESULTS
  )
    throw new RangeError(
      "Gen3 PokeSpot Wasm core returned an invalid result count.",
    );
  if (resultCount !== wasm._gen3pokespot_result_count())
    throw new Error(
      "Gen3 PokeSpot result count changed before the buffer was copied.",
    );
  const bytePointer = wasm._gen3pokespot_result_ptr();
  const wordCount = resultCount * GEN3_POKE_SPOT_RESULT_WORDS;
  if (
    bytePointer < 0 ||
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + wordCount >
      wasm.HEAPU32.length
  )
    throw new RangeError(
      "Gen3 PokeSpot Wasm core returned an invalid result range.",
    );
  const pointer = bytePointer / Uint32Array.BYTES_PER_ELEMENT;
  const words = wasm.HEAPU32.slice(pointer, pointer + wordCount);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      resultLimitReached: errorCode === 2,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

self.onmessage = async ({ data }: MessageEvent<Gen3PokeSpotWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
