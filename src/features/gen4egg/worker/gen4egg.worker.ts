/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen4EggRequest,
  GEN4_EGG_API_VERSION,
  GEN4_EGG_GENERATOR_RESULT_WORDS,
  GEN4_EGG_MAX_STATES_PER_CALL,
  GEN4_EGG_MAX_WASM_RESULTS,
  GEN4_EGG_REQUEST_WORDS,
  GEN4_EGG_SEARCHER_RESULT_WORDS,
  gen4EggSearcherSeedCount,
  validateGen4EggGeneratorRequest,
  validateGen4EggSearcherRequest,
  type Gen4EggGeneratorChunk,
  type Gen4EggGeneratorRequest,
  type Gen4EggSearcherChunk,
  type Gen4EggSearcherRequest,
} from "../domain";
import type { Gen4EggWorkerRequest, Gen4EggWorkerResponse } from "./messages";

interface Gen4EggEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen4egg_api_version(): number;
  _gen4egg_generate(
    requestPointer: number,
    requestWords: number,
    initialAdvancesHeld: number,
    maxAdvancesHeld: number,
  ): number;
  _gen4egg_search(
    requestPointer: number,
    requestWords: number,
    startIndex: number,
    stateCount: number,
  ): number;
  _gen4egg_result_ptr(): number;
  _gen4egg_result_count(): number;
  _gen4egg_last_error(): number;
}

type Gen4EggModuleFactory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4EggEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4EggEmscriptenModule | undefined;

function post(message: Gen4EggWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4EggWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4egg" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_EGG_API_VERSION
  ) {
    throw new Error("Gen4 egg Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Gen4EggModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen4 egg Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4egg_api_version();
  if (apiVersion !== GEN4_EGG_API_VERSION) {
    throw new Error(
      `Gen4 egg Wasm API ${apiVersion} does not match UI API ${GEN4_EGG_API_VERSION}.`,
    );
  }
  post({
    type: "ready",
    moduleId: "gen4egg",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function calculate(message: Extract<Gen4EggWorkerRequest, { type: "task" }>) {
  const currentWasm = wasm;
  if (!currentWasm) throw new Error("Gen4 egg Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4egg" ||
    message.apiVersion !== GEN4_EGG_API_VERSION ||
    (message.operation !== "generator" && message.operation !== "searcher")
  ) {
    throw new Error("Gen4 egg task contract mismatch.");
  }

  if (
    typeof message.request !== "object" ||
    message.request === null ||
    typeof message.chunk !== "object" ||
    message.chunk === null ||
    message.chunkIndex !== message.chunk.index ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0
  ) {
    throw new Error("Gen4 egg task payload mismatch.");
  }

  const requestValue = message.request as unknown as Record<string, unknown>;
  const chunkValue = message.chunk as unknown as Record<string, unknown>;
  const generator = message.operation === "generator";
  const requestShape = generator
    ? "seedHeld" in requestValue &&
      "seedPickup" in requestValue &&
      !("minDelay" in requestValue) &&
      !("maxDelay" in requestValue)
    : "minDelay" in requestValue &&
      "maxDelay" in requestValue &&
      !("seedHeld" in requestValue) &&
      !("seedPickup" in requestValue);
  const chunkShape = generator
    ? "initialAdvancesHeld" in chunkValue &&
      "maxAdvancesHeld" in chunkValue &&
      !("startIndex" in chunkValue)
    : "startIndex" in chunkValue &&
      !("initialAdvancesHeld" in chunkValue) &&
      !("maxAdvancesHeld" in chunkValue);
  if (!requestShape || !chunkShape) {
    throw new Error("Gen4 egg task payload mismatch.");
  }

  const originalRequest = generator
    ? (message.request as Gen4EggGeneratorRequest)
    : (message.request as Gen4EggSearcherRequest);
  const validationErrors = generator
    ? validateGen4EggGeneratorRequest(
        originalRequest as Gen4EggGeneratorRequest,
      )
    : validateGen4EggSearcherRequest(originalRequest as Gen4EggSearcherRequest);
  if (validationErrors.length > 0) {
    throw new Error(
      `Invalid Gen4 egg request: ${validationErrors.join(", ")}.`,
    );
  }

  let request: Gen4EggGeneratorRequest | Gen4EggSearcherRequest;
  if (generator) {
    const generatorRequest = originalRequest as Gen4EggGeneratorRequest;
    const chunk = message.chunk as Gen4EggGeneratorChunk;
    if (
      !Number.isInteger(chunk.index) ||
      chunk.index < 0 ||
      chunk.index >= generatorRequest.maxAdvancesHeld + 1 ||
      !Number.isInteger(chunk.stateCount) ||
      chunk.stateCount < 1 ||
      chunk.stateCount > GEN4_EGG_MAX_STATES_PER_CALL ||
      !Number.isInteger(chunk.initialAdvancesHeld) ||
      chunk.initialAdvancesHeld < 0 ||
      !Number.isInteger(chunk.maxAdvancesHeld) ||
      chunk.maxAdvancesHeld < 0 ||
      chunk.maxAdvancesHeld + 1 !== chunk.stateCount ||
      chunk.initialAdvancesHeld < generatorRequest.initialAdvancesHeld ||
      chunk.initialAdvancesHeld + chunk.maxAdvancesHeld >
        generatorRequest.initialAdvancesHeld + generatorRequest.maxAdvancesHeld
    ) {
      throw new Error("Gen4 egg Generator chunk boundary mismatch.");
    }
    request = {
      ...generatorRequest,
      initialAdvancesHeld: chunk.initialAdvancesHeld,
      maxAdvancesHeld: chunk.maxAdvancesHeld,
    };
    const chunkErrors = validateGen4EggGeneratorRequest(request);
    if (chunkErrors.length > 0) {
      throw new Error(
        `Invalid Gen4 egg Generator chunk: ${chunkErrors.join(", ")}.`,
      );
    }
  } else {
    const searcherRequest = originalRequest as Gen4EggSearcherRequest;
    const chunk = message.chunk as Gen4EggSearcherChunk;
    const total = gen4EggSearcherSeedCount(searcherRequest);
    if (
      !Number.isInteger(chunk.index) ||
      chunk.index < 0 ||
      chunk.index >= total ||
      !Number.isInteger(chunk.startIndex) ||
      chunk.startIndex < 0 ||
      !Number.isInteger(chunk.stateCount) ||
      chunk.stateCount < 1 ||
      chunk.stateCount > GEN4_EGG_MAX_STATES_PER_CALL ||
      chunk.startIndex + chunk.stateCount > total
    ) {
      throw new Error("Gen4 egg Searcher chunk boundary mismatch.");
    }
    request = searcherRequest;
  }

  const startedAt = performance.now();
  const encodedRequest = encodeGen4EggRequest(request);
  if (encodedRequest.length !== GEN4_EGG_REQUEST_WORDS) {
    throw new RangeError(
      "Gen4 egg request encoder returned an invalid word count.",
    );
  }
  const pointer = currentWasm._malloc(encodedRequest.byteLength);
  if (
    !Number.isInteger(pointer) ||
    pointer <= 0 ||
    pointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    pointer / Uint32Array.BYTES_PER_ELEMENT + encodedRequest.length >
      currentWasm.HEAPU32.length
  ) {
    throw new Error("Gen4 egg Wasm could not allocate a request buffer.");
  }

  try {
    currentWasm.HEAPU32.set(encodedRequest, pointer >>> 2);
    let resultCount: number;
    let processedCount: number;
    let wordsPerState: number;
    if (message.operation === "generator") {
      const chunk = message.chunk as Gen4EggGeneratorChunk;
      resultCount = currentWasm._gen4egg_generate(
        pointer,
        encodedRequest.length,
        chunk.initialAdvancesHeld,
        chunk.maxAdvancesHeld,
      );
      processedCount =
        chunk.stateCount *
        ((message.request as Gen4EggGeneratorRequest).maxAdvancesPickup + 1);
      wordsPerState = GEN4_EGG_GENERATOR_RESULT_WORDS;
    } else {
      const chunk = message.chunk as Gen4EggSearcherChunk;
      resultCount = currentWasm._gen4egg_search(
        pointer,
        encodedRequest.length,
        chunk.startIndex,
        chunk.stateCount,
      );
      processedCount = chunk.stateCount;
      wordsPerState = GEN4_EGG_SEARCHER_RESULT_WORDS;
    }

    const errorCode = currentWasm._gen4egg_last_error();
    if (errorCode !== 0) {
      throw new Error(`Gen4 egg Wasm core returned error ${errorCode}.`);
    }
    if (resultCount !== currentWasm._gen4egg_result_count()) {
      throw new Error(
        "Gen4 egg Wasm result count changed before the buffer was copied.",
      );
    }
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > GEN4_EGG_MAX_WASM_RESULTS
    ) {
      throw new RangeError("Gen4 egg Wasm returned an invalid result count.");
    }
    const resultBytePointer = currentWasm._gen4egg_result_ptr();
    const resultWordCount = resultCount * wordsPerState;
    if (
      !Number.isInteger(resultBytePointer) ||
      resultBytePointer < 0 ||
      resultBytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      (resultWordCount > 0 && resultBytePointer === 0) ||
      resultBytePointer / Uint32Array.BYTES_PER_ELEMENT + resultWordCount >
        currentWasm.HEAPU32.length
    ) {
      throw new RangeError(
        "Gen4 egg Wasm core returned an invalid result range.",
      );
    }
    const resultPointer = resultBytePointer / Uint32Array.BYTES_PER_ELEMENT;
    const words = currentWasm.HEAPU32.slice(
      resultPointer,
      resultPointer + resultWordCount,
    );
    post(
      {
        type: "batch",
        moduleId: "gen4egg",
        apiVersion: GEN4_EGG_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: words.buffer,
      },
      [words.buffer],
    );
  } finally {
    currentWasm._free(pointer);
  }
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen4EggWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4egg",
      apiVersion: GEN4_EGG_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
