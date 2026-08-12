/// <reference lib="webworker" />

import {
  encodeGen3EggRequest,
  GEN3_EGG_API_VERSION,
  GEN3_EGG_REQUEST_WORDS,
  GEN3_EGG_RESULT_WORDS,
  GEN3_EGG_MAX_PAIRS_PER_WASM_CALL,
} from "../domain";
import type {
  Gen3EggWorkerRequest,
  Gen3EggWorkerResponse,
} from "./messages";

interface Gen3EggEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen3egg_api_version(): number;
  _gen3egg_generate(
    requestPointer: number,
    requestWords: number,
    initialAdvancesHeld: number,
    maxAdvancesHeld: number,
    maxResults: number,
  ): number;
  _gen3egg_result_ptr(): number;
  _gen3egg_result_count(): number;
  _gen3egg_result_truncated(): number;
  _gen3egg_last_error(): number;
}

type Gen3EggModuleFactory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3EggEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3EggEmscriptenModule | undefined;

function post(message: Gen3EggWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Gen3EggModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError("Gen3 egg Wasm module does not export a default factory.");
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3egg_api_version();
  if (apiVersion !== GEN3_EGG_API_VERSION) {
    throw new Error(
      `Gen3 egg Wasm API ${apiVersion} does not match UI API ${GEN3_EGG_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3EggWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 egg Wasm module is not initialized.");
  const startedAt = performance.now();
  const request = encodeGen3EggRequest({
    ...message.request,
    initialAdvancesHeld: message.chunk.initialAdvancesHeld,
    maxAdvancesHeld: message.chunk.maxAdvancesHeld,
  });
  const pointer = wasm._malloc(GEN3_EGG_REQUEST_WORDS * Uint32Array.BYTES_PER_ELEMENT);
  if (pointer === 0) throw new Error("Gen3 egg Wasm could not allocate a request buffer.");
  try {
    wasm.HEAPU32.set(request, pointer >>> 2);
    const resultCount = wasm._gen3egg_generate(
      pointer,
      request.length,
      message.chunk.initialAdvancesHeld,
      message.chunk.maxAdvancesHeld,
      GEN3_EGG_MAX_PAIRS_PER_WASM_CALL,
    );
    const errorCode = wasm._gen3egg_last_error();
    if (errorCode !== 0) {
      throw new Error(`Gen3 egg Wasm core returned error ${errorCode}.`);
    }
    if (resultCount !== wasm._gen3egg_result_count()) {
      throw new Error("Gen3 egg Wasm result count changed before the buffer was copied.");
    }
    if (resultCount > GEN3_EGG_MAX_PAIRS_PER_WASM_CALL) {
      throw new RangeError("Gen3 egg Wasm core exceeded its result limit.");
    }
    const resultBytePointer = wasm._gen3egg_result_ptr();
    const resultWordCount = resultCount * GEN3_EGG_RESULT_WORDS;
    if (
      resultBytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      resultBytePointer / Uint32Array.BYTES_PER_ELEMENT + resultWordCount >
        wasm.HEAPU32.length
    ) {
      throw new RangeError("Gen3 egg Wasm core returned an invalid result range.");
    }
    const resultPointer = resultBytePointer / Uint32Array.BYTES_PER_ELEMENT;
    const words = wasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultWordCount,
    );
    post(
      {
        type: "batch",
        taskId: message.taskId,
        chunkIndex: message.chunk.index,
        stateCount: message.chunk.stateCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        truncated: wasm._gen3egg_result_truncated() !== 0,
        buffer: words.buffer,
      },
      [words.buffer],
    );
  } finally {
    wasm._free(pointer);
  }
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3EggWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      chunkIndex: data.type === "init" ? undefined : data.chunk.index,
      code: data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
