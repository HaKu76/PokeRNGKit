/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN4_ADVANCE_API_VERSION,
  gen4AdvanceModeToWasm,
  packGen4AdvanceRows,
  packGen4AdvanceTokens,
  validateGen4AdvanceRequest,
} from "../domain";
import type {
  Gen4AdvanceWorkerRequest,
  Gen4AdvanceWorkerResponse,
} from "./messages";

interface Gen4AdvanceEmscriptenModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen4advance_api_version(): number;
  _gen4advance_search(
    mode: number,
    rows: number,
    rowCount: number,
    tokens: number,
    tokenCount: number,
  ): number;
  _gen4advance_result_ptr(): number;
  _gen4advance_result_count(): number;
  _gen4advance_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen4AdvanceEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4AdvanceEmscriptenModule | undefined;

function post(
  message: Gen4AdvanceWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(
  message: Extract<Gen4AdvanceWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen4advance" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN4_ADVANCE_API_VERSION
  )
    throw new Error("Gen4 Advance Finder Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen4 Advance Finder Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen4advance_api_version();
  if (apiVersion !== GEN4_ADVANCE_API_VERSION)
    throw new Error(
      `Gen4 Advance Finder Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen4advance",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["searcher"],
  });
}

function search(message: Extract<Gen4AdvanceWorkerRequest, { type: "task" }>) {
  const currentWasm = wasm;
  if (!currentWasm)
    throw new Error("Gen4 Advance Finder Wasm module is not initialized.");
  if (
    message.moduleId !== "gen4advance" ||
    message.apiVersion !== GEN4_ADVANCE_API_VERSION ||
    message.operation !== "searcher" ||
    message.chunkIndex !== 0 ||
    typeof message.request !== "object" ||
    message.request === null ||
    typeof message.chunk !== "object" ||
    message.chunk === null ||
    message.chunk.index !== 0 ||
    message.chunkIndex !== message.chunk.index ||
    !Number.isInteger(message.chunk.stateCount) ||
    message.chunk.stateCount !== message.request.rows?.length ||
    validateGen4AdvanceRequest(message.request).length > 0
  )
    throw new Error("Gen4 Advance Finder task contract mismatch.");
  const rows = packGen4AdvanceRows(message.request.rows);
  const tokens = packGen4AdvanceTokens(message.request.tokens);
  const rowsPointer = currentWasm._malloc(rows.byteLength);
  const tokensPointer = currentWasm._malloc(tokens.byteLength);
  try {
    if (
      !Number.isInteger(rowsPointer) ||
      rowsPointer <= 0 ||
      rowsPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      rowsPointer / Uint32Array.BYTES_PER_ELEMENT + rows.length >
        currentWasm.HEAPU32.length ||
      !Number.isInteger(tokensPointer) ||
      tokensPointer <= 0 ||
      tokensPointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      tokensPointer / Uint32Array.BYTES_PER_ELEMENT + tokens.length >
        currentWasm.HEAPU32.length
    )
      throw new RangeError(
        "Gen4 Advance Finder Wasm could not allocate request buffers.",
      );
    currentWasm.HEAPU32.set(rows, rowsPointer >>> 2);
    currentWasm.HEAPU32.set(tokens, tokensPointer >>> 2);
    const startedAt = performance.now();
    const resultCount = currentWasm._gen4advance_search(
      gen4AdvanceModeToWasm(message.request.mode),
      rowsPointer,
      message.request.rows.length,
      tokensPointer,
      message.request.tokens.length,
    );
    const error = currentWasm._gen4advance_last_error();
    if (error !== 0)
      throw new Error(`Gen4 Advance Finder Wasm returned error ${error}.`);
    if (resultCount !== currentWasm._gen4advance_result_count())
      throw new Error(
        "Gen4 Advance Finder Wasm result count changed before copy.",
      );
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.rows.length
    )
      throw new RangeError(
        "Gen4 Advance Finder Wasm returned an invalid result count.",
      );
    const resultBytePointer = currentWasm._gen4advance_result_ptr();
    const resultWordCount = resultCount * 2;
    if (
      !Number.isInteger(resultBytePointer) ||
      resultBytePointer < 0 ||
      resultBytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
      (resultWordCount > 0 && resultBytePointer === 0) ||
      resultBytePointer / Uint32Array.BYTES_PER_ELEMENT + resultWordCount >
        currentWasm.HEAPU32.length
    )
      throw new RangeError(
        "Gen4 Advance Finder Wasm returned an invalid result range.",
      );
    const start = resultBytePointer / Uint32Array.BYTES_PER_ELEMENT;
    const results = currentWasm.HEAPU32.slice(start, start + resultWordCount);
    post(
      {
        type: "batch",
        moduleId: "gen4advance",
        apiVersion: GEN4_ADVANCE_API_VERSION,
        taskId: message.taskId,
        operation: "searcher",
        chunkIndex: message.chunkIndex,
        processedCount: message.chunk.stateCount,
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: results.buffer,
      },
      [results.buffer],
    );
  } finally {
    currentWasm._free(rowsPointer);
    currentWasm._free(tokensPointer);
  }
}

scope.onmessage = async ({ data }: MessageEvent<Gen4AdvanceWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen4advance",
      apiVersion: GEN4_ADVANCE_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "search_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
