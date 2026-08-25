/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_STATIC_API_VERSION,
  gen4StaticAbilityToWasm,
  gen4StaticGenderToWasm,
  gen4StaticLeadCode,
  gen4StaticMethodToWasm,
  gen4StaticShinyToWasm,
  type Gen4StaticChunk,
  type Gen4StaticGeneratorRequest,
  type Gen4StaticSearcherChunk,
  type Gen4StaticSearcherRequest,
} from "../domain";
import type {
  Gen4StaticWorkerRequest,
  Gen4StaticWorkerResponse,
} from "./messages";

interface Gen4StaticEmscriptenModule {
  HEAPU32: Uint32Array;
  _gen4static_api_version(): number;
  _gen4static_generate(...args: number[]): number;
  _gen4static_search(...args: number[]): number;
  _gen4static_result_ptr(): number;
  _gen4static_result_count(): number;
  _gen4static_last_error(): number;
}

type Gen4StaticModuleFactory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4StaticEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4StaticEmscriptenModule | undefined;

function post(
  message: Gen4StaticWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(message, transfer);
}

function commonArguments(
  request: Gen4StaticGeneratorRequest | Gen4StaticSearcherRequest,
) {
  const { filters, template } = request;
  return [
    gen4StaticMethodToWasm(request.method),
    gen4StaticLeadCode(request.lead),
    request.syncNature,
    template.species,
    template.level,
    template.genderRatio,
    { random: 0, never: 1, always: 2 }[template.shinyLock],
    request.tid,
    request.sid,
    gen4StaticShinyToWasm(filters.shiny),
    gen4StaticGenderToWasm(filters.gender),
    gen4StaticAbilityToWasm(filters.ability),
    filters.natureMask,
    filters.hiddenPowerMask,
    ...filters.ivMin,
    ...filters.ivMax,
    filters.perfectIvValue,
    filters.perfectIvCount,
  ];
}

async function initialize(
  message: Extract<Gen4StaticWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4static" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_STATIC_API_VERSION
  ) {
    throw new Error("Gen4 static Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Gen4StaticModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen4 static Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4static_api_version();
  if (apiVersion !== GEN4_STATIC_API_VERSION) {
    throw new Error(
      `Gen4 static Wasm API ${apiVersion} does not match UI API ${GEN4_STATIC_API_VERSION}.`,
    );
  }
  post({
    type: "ready",
    moduleId: "gen4static",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function calculate(
  message: Extract<Gen4StaticWorkerRequest, { type: "task" }>,
) {
  if (!wasm) throw new Error("Gen4 static Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4static" ||
    message.apiVersion !== GEN4_STATIC_API_VERSION
  ) {
    throw new Error("Gen4 static task contract mismatch.");
  }

  const startedAt = performance.now();
  let resultCount: number;
  let processedCount: number;
  let wordsPerState: number;
  if (message.operation === "generator") {
    const request = message.request as Gen4StaticGeneratorRequest;
    const chunk = message.chunk as Gen4StaticChunk;
    resultCount = wasm._gen4static_generate(
      request.seed,
      chunk.initialAdvances,
      chunk.maxAdvances,
      request.offset,
      ...commonArguments(request),
    );
    processedCount = chunk.stateCount;
    wordsPerState = 17;
  } else {
    const request = message.request as Gen4StaticSearcherRequest;
    const chunk = message.chunk as Gen4StaticSearcherChunk;
    resultCount = wasm._gen4static_search(
      chunk.startIndex,
      chunk.stateCount,
      request.minAdvance,
      request.maxAdvance,
      request.minDelay,
      request.maxDelay,
      ...commonArguments(request),
    );
    processedCount = chunk.stateCount;
    wordsPerState = 20;
  }

  const errorCode = wasm._gen4static_last_error();
  if (errorCode !== 0) {
    throw new Error(`Gen4 static Wasm core returned error ${errorCode}.`);
  }
  if (resultCount !== wasm._gen4static_result_count()) {
    throw new Error(
      "Gen4 static Wasm result count changed before the buffer was copied.",
    );
  }
  const pointer = wasm._gen4static_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(
    pointer,
    pointer + resultCount * wordsPerState,
  );
  post(
    {
      type: "batch",
      moduleId: "gen4static",
      apiVersion: GEN4_STATIC_API_VERSION,
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
}: MessageEvent<Gen4StaticWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else calculate(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4static",
      apiVersion: GEN4_STATIC_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
