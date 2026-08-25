/// <reference lib="webworker" />
import {
  abilityToWasm,
  categoryToWasm,
  GEN3_GAMECUBE_API_VERSION,
  GEN3_GAMECUBE_MAX_RESULTS,
  GEN3_GAMECUBE_RESULT_WORDS,
  genderToWasm,
  shinyToWasm,
  versionToWasm,
} from "../domain";
import type { GameCubeWorkerRequest, GameCubeWorkerResponse } from "./messages";
interface Module {
  HEAPU32: Uint32Array;
  _gen3gamecube_api_version(): number;
  _gen3gamecube_generate(ptr: number, words: number): number;
  _gen3gamecube_search(ptr: number, words: number): number;
  _gen3gamecube_result_ptr(): number;
  _gen3gamecube_result_count(): number;
  _gen3gamecube_last_error(): number;
  _malloc(size: number): number;
  _free(ptr: number): void;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Module>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Module | undefined;
function post(message: GameCubeWorkerResponse, transfer: Transferable[] = []) {
  scope.postMessage(message, transfer);
}
async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen3 GameCube Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3gamecube_api_version();
  if (apiVersion !== GEN3_GAMECUBE_API_VERSION)
    throw new Error(
      `Gen3 GameCube Wasm API ${apiVersion} does not match UI API ${GEN3_GAMECUBE_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}
function requestWords(
  message: Extract<GameCubeWorkerRequest, { type: "run" }>,
) {
  const { request, chunk } = message;
  const words = new Uint32Array(57);
  words[0] = categoryToWasm(request.category);
  words[1] = versionToWasm(request.version, request.category);
  words[2] = request.template.species;
  words[3] = request.template.level;
  words[4] = request.template.shiny;
  words[5] = request.template.shadowType;
  words[6] = request.template.locks.length;
  words[7] = request.tid;
  words[8] = request.sid;
  words[9] = request.firstShadowUnset ? 1 : 0;
  words[10] = request.seed;
  words[11] = chunk.request.initialAdvances;
  words[12] = chunk.request.maxAdvances;
  words[13] = chunk.request.offset;
  words[14] = shinyToWasm(request.filters.shiny);
  words[15] = genderToWasm(request.filters.gender);
  words[16] = abilityToWasm(request.filters.ability);
  words[17] = request.filters.natureMask;
  words[18] = request.filters.hiddenPowerMask;
  words.set(chunk.ivMin, 19);
  words.set(chunk.ivMax, 25);
  words.set(request.template.personalStats ?? [0, 0, 0, 0, 0, 0], 31);
  words[37] = request.template.genderRatio ?? 127;
  words[38] = request.template.abilitySlots?.[0] ?? 0;
  words[39] = request.template.abilitySlots?.[1] ?? 0;
  request.template.locks.forEach((lock, index) =>
    words.set([lock.nature, lock.gender, lock.genderRatio], 40 + index * 3),
  );
  words[55] = request.filters.perfectIvValue;
  words[56] = request.filters.perfectIvCount;
  return words;
}
function run(message: Extract<GameCubeWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 GameCube Wasm module is not initialized.");
  const currentWasm = wasm;
  const words = requestWords(message);
  const pointer = currentWasm._malloc(words.byteLength);
  if (
    pointer === 0 ||
    pointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    pointer / Uint32Array.BYTES_PER_ELEMENT + words.length >
      currentWasm.HEAPU32.length
  ) {
    if (pointer !== 0) currentWasm._free(pointer);
    throw new RangeError(
      "Gen3 GameCube Wasm core returned an invalid request range.",
    );
  }
  const invoke = () => {
    try {
      currentWasm.HEAPU32.set(words, pointer / Uint32Array.BYTES_PER_ELEMENT);
      const resultCount =
        message.request.operation === "generator"
          ? currentWasm._gen3gamecube_generate(pointer, words.length)
          : currentWasm._gen3gamecube_search(pointer, words.length);
      return [resultCount, currentWasm._gen3gamecube_last_error()] as const;
    } finally {
      currentWasm._free(pointer);
    }
  };
  const [resultCount, errorCode] = invoke();
  if (errorCode !== 0 && errorCode !== 2)
    throw new Error(`Gen3 GameCube Wasm core returned error ${errorCode}.`);
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount > GEN3_GAMECUBE_MAX_RESULTS
  )
    throw new RangeError(
      "Gen3 GameCube Wasm core returned an invalid result count.",
    );
  if (resultCount !== wasm._gen3gamecube_result_count())
    throw new Error("Gen3 GameCube result count changed before copying.");
  const bytePointer = wasm._gen3gamecube_result_ptr();
  const wordCount = resultCount * GEN3_GAMECUBE_RESULT_WORDS;
  if (
    bytePointer < 0 ||
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + wordCount >
      wasm.HEAPU32.length
  )
    throw new RangeError(
      "Gen3 GameCube Wasm core returned an invalid result range.",
    );
  const resultPointer = bytePointer / Uint32Array.BYTES_PER_ELEMENT;
  const copied = wasm.HEAPU32.slice(resultPointer, resultPointer + wordCount);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      resultLimitReached: errorCode === 2,
      buffer: copied.buffer,
    },
    [copied.buffer],
  );
}
scope.onmessage = async ({ data }: MessageEvent<GameCubeWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "run" ? data.taskId : undefined,
      code:
        data.type === "run" ? "calculation_failed" : "initialization_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
