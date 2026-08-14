/// <reference lib="webworker" />

import {
  RESEARCHER_API_VERSION,
  packResearcherCustoms,
  packResearcherSeeds,
  researcherRngToWasm,
  validateResearcherRequest,
} from "../domain";
import {
  RESEARCHER_CONTRACT_VERSION,
  RESEARCHER_MODULE_ID,
  type ResearcherWorkerRequest,
  type ResearcherWorkerResponse,
} from "./messages";

interface ResearcherEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _researcher_api_version(): number;
  _researcher_begin(
    rng: number,
    seedWords: number,
    seedWordCount: number,
    initialAdvances: number,
    customs: number,
    customCount: number,
  ): number;
  _researcher_generate(stateCount: number): number;
  _researcher_result_ptr(): number;
  _researcher_result_count(): number;
  _researcher_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<ResearcherEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: ResearcherEmscriptenModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: ResearcherWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<ResearcherWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== RESEARCHER_MODULE_ID ||
    message.contractVersion !== RESEARCHER_CONTRACT_VERSION ||
    message.apiVersion !== RESEARCHER_API_VERSION
  )
    throw new Error("Researcher Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Researcher Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._researcher_api_version();
  if (apiVersion !== RESEARCHER_API_VERSION)
    throw new Error(`Researcher Wasm API ${apiVersion} does not match the UI.`);
  post({
    type: "ready",
    moduleId: RESEARCHER_MODULE_ID,
    contractVersion: RESEARCHER_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function task(message: Extract<ResearcherWorkerRequest, { type: "task" }>) {
  const currentWasm = wasm;
  if (!currentWasm)
    throw new Error("Researcher Wasm module is not initialized.");
  if (
    message.moduleId !== RESEARCHER_MODULE_ID ||
    message.apiVersion !== RESEARCHER_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0 ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.stateCount) ||
    message.chunk.stateCount <= 0 ||
    message.chunk.stateCount > 10_000 ||
    validateResearcherRequest(message.request).length > 0
  )
    throw new Error("Researcher task contract mismatch.");
  if (message.chunkIndex === 0) {
    activeTaskId = message.taskId;
    const seeds = packResearcherSeeds(message.request.seedWords);
    const customs = packResearcherCustoms(message.request.customs);
    const seedPointer = currentWasm._malloc(seeds.byteLength);
    const customPointer = currentWasm._malloc(customs.byteLength);
    try {
      if (
        seedPointer <= 0 ||
        seedPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
        seedPointer / Uint32Array.BYTES_PER_ELEMENT + seeds.length >
          currentWasm.HEAPU32.length ||
        customPointer <= 0 ||
        customPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
        customPointer / Uint32Array.BYTES_PER_ELEMENT + customs.length >
          currentWasm.HEAPU32.length
      )
        throw new RangeError(
          "Researcher Wasm could not allocate request buffers.",
        );
      currentWasm.HEAPU32.set(seeds, seedPointer >>> 2);
      currentWasm.HEAPU32.set(customs, customPointer >>> 2);
      const ok = currentWasm._researcher_begin(
        researcherRngToWasm(message.request.rng),
        seedPointer,
        seeds.length,
        message.request.initialAdvances,
        customPointer,
        message.request.customs.length,
      );
      if (ok !== 1 || currentWasm._researcher_last_error() !== 0)
        throw new Error(
          `Researcher Wasm begin returned error ${currentWasm._researcher_last_error()}.`,
        );
    } finally {
      if (seedPointer > 0) currentWasm._free(seedPointer);
      if (customPointer > 0) currentWasm._free(customPointer);
    }
  } else if (activeTaskId !== message.taskId) {
    throw new Error("Researcher Worker received an out-of-order task.");
  }
  const startedAt = performance.now();
  const resultCount = currentWasm._researcher_generate(
    message.chunk.stateCount,
  );
  const error = currentWasm._researcher_last_error();
  if (error !== 0) throw new Error(`Researcher Wasm returned error ${error}.`);
  if (
    resultCount !== message.chunk.stateCount ||
    resultCount !== currentWasm._researcher_result_count()
  )
    throw new Error("Researcher Wasm result count changed before copy.");
  const resultPointer = currentWasm._researcher_result_ptr();
  const resultWordCount = resultCount * 23;
  if (
    resultPointer <= 0 ||
    resultPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    resultPointer / Uint32Array.BYTES_PER_ELEMENT + resultWordCount >
      currentWasm.HEAPU32.length
  )
    throw new RangeError("Researcher Wasm returned an invalid result range.");
  const results = currentWasm.HEAPU32.slice(
    resultPointer >>> 2,
    (resultPointer >>> 2) + resultWordCount,
  );
  post(
    {
      type: "batch",
      moduleId: RESEARCHER_MODULE_ID,
      apiVersion: RESEARCHER_API_VERSION,
      taskId: message.taskId,
      operation: "generator",
      chunkIndex: message.chunkIndex,
      processedCount: resultCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: results.buffer,
    },
    [results.buffer],
  );
}

scope.onmessage = async ({ data }: MessageEvent<ResearcherWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else task(data);
  } catch (error) {
    activeTaskId = undefined;
    post({
      type: "error",
      moduleId: RESEARCHER_MODULE_ID,
      apiVersion: RESEARCHER_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "generation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
