/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_EVENT_API_VERSION,
  GEN4_EVENT_MAX_RESULTS,
  GEN4_EVENT_MAX_STATES_PER_CALL,
  gen4EventSearcherCombinationCount,
  validateGen4EventGeneratorRequest,
  validateGen4EventSearcherRequest,
  type Gen4EventChunk,
  type Gen4EventGeneratorRequest,
  type Gen4EventSearcherChunk,
  type Gen4EventSearcherRequest,
} from "../domain";
import type {
  Gen4EventWorkerRequest,
  Gen4EventWorkerResponse,
} from "./messages";

interface Gen4EventEmscriptenModule {
  HEAPU32: Uint32Array;
  _gen4event_api_version(): number;
  _gen4event_generate(...args: number[]): number;
  _gen4event_search(...args: number[]): number;
  _gen4event_result_ptr(): number;
  _gen4event_result_count(): number;
  _gen4event_last_error(): number;
}

type Gen4EventModuleFactory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4EventEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4EventEmscriptenModule | undefined;

function post(message: Gen4EventWorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

function commonArguments(
  request: Gen4EventGeneratorRequest | Gen4EventSearcherRequest,
) {
  return [
    request.species,
    request.nature,
    request.level,
    request.filters.hiddenPowerMask,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
  ];
}

async function initialize(
  message: Extract<Gen4EventWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4event" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_EVENT_API_VERSION
  )
    throw new Error("Gen4 event Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Gen4EventModuleFactory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen4 event Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4event_api_version();
  if (apiVersion !== GEN4_EVENT_API_VERSION)
    throw new Error(
      `Gen4 event Wasm API ${apiVersion} does not match UI API ${GEN4_EVENT_API_VERSION}.`,
    );
  post({
    type: "ready",
    moduleId: "gen4event",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function calculate(message: Extract<Gen4EventWorkerRequest, { type: "task" }>) {
  if (!wasm) throw new Error("Gen4 event Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4event" ||
    message.apiVersion !== GEN4_EVENT_API_VERSION
  )
    throw new Error("Gen4 event task contract mismatch.");
  if (message.operation !== "generator" && message.operation !== "searcher")
    throw new Error("Gen4 event task operation mismatch.");
  if (
    typeof message.request !== "object" ||
    message.request === null ||
    typeof message.chunk !== "object" ||
    message.chunk === null ||
    message.chunkIndex !== message.chunk.index
  )
    throw new Error("Gen4 event task payload mismatch.");
  const generator = message.operation === "generator";
  if (
    generator !== "seed" in message.request ||
    generator !== "initialAdvances" in message.chunk
  )
    throw new Error("Gen4 event task payload mismatch.");
  if (
    !Number.isInteger(message.chunk.index) ||
    message.chunk.index < 0 ||
    !Number.isInteger(message.chunk.stateCount) ||
    message.chunk.stateCount < 1 ||
    message.chunk.stateCount > GEN4_EVENT_MAX_STATES_PER_CALL
  )
    throw new Error("Gen4 event chunk boundary mismatch.");

  const request = generator
    ? ({
        ...message.request,
        initialAdvances: (message.chunk as Gen4EventChunk).initialAdvances,
        maxAdvances: (message.chunk as Gen4EventChunk).maxAdvances,
      } as Gen4EventGeneratorRequest)
    : (message.request as Gen4EventSearcherRequest);
  const validationErrors = generator
    ? validateGen4EventGeneratorRequest(request as Gen4EventGeneratorRequest)
    : validateGen4EventSearcherRequest(request as Gen4EventSearcherRequest);
  if (validationErrors.length > 0)
    throw new Error(
      `Invalid Gen4 event request: ${validationErrors.join(", ")}.`,
    );

  if (generator) {
    const chunk = message.chunk as Gen4EventChunk;
    if (chunk.maxAdvances + 1 !== chunk.stateCount)
      throw new Error("Gen4 event Generator chunk boundary mismatch.");
  } else {
    const chunk = message.chunk as Gen4EventSearcherChunk;
    if (
      !Number.isInteger(chunk.startIndex) ||
      chunk.startIndex < 0 ||
      chunk.startIndex + chunk.stateCount >
        gen4EventSearcherCombinationCount(request as Gen4EventSearcherRequest)
    )
      throw new Error("Gen4 event Searcher chunk boundary mismatch.");
  }

  const startedAt = performance.now();
  let resultCount: number;
  let processedCount: number;
  let wordsPerState: number;
  if (generator) {
    const generatorRequest = request as Gen4EventGeneratorRequest;
    const chunk = message.chunk as Gen4EventChunk;
    resultCount = wasm._gen4event_generate(
      generatorRequest.seed,
      chunk.initialAdvances,
      chunk.maxAdvances,
      generatorRequest.offset,
      ...commonArguments(generatorRequest),
    );
    processedCount = chunk.stateCount;
    wordsPerState = 11;
  } else {
    const searcherRequest = request as Gen4EventSearcherRequest;
    const chunk = message.chunk as Gen4EventSearcherChunk;
    resultCount = wasm._gen4event_search(
      chunk.startIndex,
      chunk.stateCount,
      searcherRequest.minAdvance,
      searcherRequest.maxAdvance,
      searcherRequest.minDelay,
      searcherRequest.maxDelay,
      ...commonArguments(searcherRequest),
    );
    processedCount = chunk.stateCount;
    wordsPerState = 12;
  }
  const errorCode = wasm._gen4event_last_error();
  if (errorCode !== 0)
    throw new Error(`Gen4 event Wasm core returned error ${errorCode}.`);
  if (resultCount !== wasm._gen4event_result_count())
    throw new Error(
      "Gen4 event Wasm result count changed before the buffer was copied.",
    );
  if (
    !Number.isInteger(resultCount) ||
    resultCount < 0 ||
    resultCount > GEN4_EVENT_MAX_RESULTS
  )
    throw new Error("Gen4 event Wasm returned an invalid result count.");
  const resultPointer = wasm._gen4event_result_ptr();
  const resultWords = resultCount * wordsPerState;
  if (
    !Number.isInteger(resultPointer) ||
    resultPointer < 0 ||
    resultPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    (resultWords > 0 && resultPointer === 0) ||
    resultPointer / Uint32Array.BYTES_PER_ELEMENT + resultWords >
      wasm.HEAPU32.length
  )
    throw new Error("Gen4 event Wasm returned an invalid result buffer.");
  const pointer = resultPointer / Uint32Array.BYTES_PER_ELEMENT;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultWords);
  post(
    {
      type: "batch",
      moduleId: "gen4event",
      apiVersion: GEN4_EVENT_API_VERSION,
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
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen4EventWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4event",
      apiVersion: GEN4_EVENT_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
