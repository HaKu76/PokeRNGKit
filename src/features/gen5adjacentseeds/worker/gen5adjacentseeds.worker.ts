/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_ADJACENT_SEEDS_API_VERSION,
  GEN5_ADJACENT_SEEDS_PREVIEW_COUNT,
  validateGen5AdjacentPreviewRequest,
  validateGen5AdjacentSeedsRequest,
  type Gen5AdjacentSeedsRequest,
} from "../domain";
import type {
  Gen5AdjacentSeedsWorkerRequest,
  Gen5AdjacentSeedsWorkerResponse,
} from "./messages";

const REQUEST_WORDS = 24;
const RESULT_WORDS = 8;

interface Gen5AdjacentSeedsEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5adjacentseeds_api_version(): number;
  _gen5adjacentseeds_generate(requestPointer: number): number;
  _gen5adjacentseeds_result_ptr(): number;
  _gen5adjacentseeds_result_count(): number;
  _gen5adjacentseeds_processed_count(): number;
  _gen5adjacentseeds_preview(
    seedLow: number,
    seedHigh: number,
    pidAdvance: number,
    chatot: number,
    outputPointer: number,
    capacity: number,
  ): number;
  _gen5adjacentseeds_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5AdjacentSeedsEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5AdjacentSeedsEmscriptenModule | undefined;

function post(
  message: Gen5AdjacentSeedsWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0) throw new TypeError(`Unsupported Gen 5 value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function packGenerateRequest(
  request: Gen5AdjacentSeedsRequest,
  minSecondOffset: number,
  maxSecondOffset: number,
) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.mac);
  const [date, time] = request.dateTime.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = time.split(":").map(Number);
  const values = [
    indexed(["black", "white", "black2", "white2"] as const, request.version),
    indexed(
      [
        "english",
        "spanish",
        "french",
        "italian",
        "german",
        "japanese",
        "korean",
      ] as const,
      request.language,
    ),
    indexed(["ds", "dsi", "3ds"] as const, request.dsType),
    macLow,
    macHigh,
    request.vcount,
    request.timer0Min,
    request.timer0Max,
    request.gxstat,
    request.vframe,
    request.memoryLink ? 1 : 0,
    year,
    month,
    day,
    hour,
    minute,
    second,
    request.seconds,
    request.buttonMask,
    request.encounter === "roamer" ? 1 : 0,
    request.initialIVAdvance,
    request.maxIVAdvances,
    minSecondOffset,
    maxSecondOffset,
  ];
  values.forEach((value, index) => {
    words[index] = value >>> 0;
  });
  return words;
}

async function initialize(
  message: Extract<Gen5AdjacentSeedsWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5adjacentseeds" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_ADJACENT_SEEDS_API_VERSION
  ) {
    throw new Error("Gen 5 Adjacent Seeds Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 5 Adjacent Seeds Wasm module has no factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5adjacentseeds_api_version();
  if (apiVersion !== GEN5_ADJACENT_SEEDS_API_VERSION)
    throw new Error(
      `Gen 5 Adjacent Seeds Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5adjacentseeds",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator"],
  });
}

function generate(
  module: Gen5AdjacentSeedsEmscriptenModule,
  message: Extract<Gen5AdjacentSeedsWorkerRequest, { type: "task" }>,
) {
  if (message.request.kind !== "generate" || message.chunk.kind !== "generate")
    throw new TypeError("Invalid Gen 5 Adjacent Seeds generation task.");
  const request = validateGen5AdjacentSeedsRequest(message.request.value);
  const { minSecondOffset, maxSecondOffset } = message.chunk;
  if (
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(minSecondOffset) ||
    !Number.isInteger(maxSecondOffset) ||
    minSecondOffset < -request.seconds ||
    maxSecondOffset > request.seconds ||
    minSecondOffset > maxSecondOffset
  ) {
    throw new RangeError("Invalid Gen 5 Adjacent Seeds Worker chunk.");
  }
  const packed = packGenerateRequest(request, minSecondOffset, maxSecondOffset);
  const requestPointer = module._malloc(packed.byteLength);
  if (requestPointer === 0)
    throw new Error("Gen 5 Adjacent Seeds Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Gen 5 Adjacent Seeds request pointer is not aligned.");
    if (requestPointer + packed.byteLength > module.HEAPU8.byteLength)
      throw new RangeError("Gen 5 Adjacent Seeds request exceeds memory.");
    module.HEAPU32.set(packed, requestPointer >>> 2);
    const startedAt = performance.now();
    const resultCount = module._gen5adjacentseeds_generate(requestPointer);
    const error = module._gen5adjacentseeds_last_error();
    if (error !== 0)
      throw new Error(`Gen 5 Adjacent Seeds Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount !== module._gen5adjacentseeds_result_count()
    ) {
      throw new Error("Gen 5 Adjacent Seeds Wasm returned an invalid count.");
    }
    const resultPointer = module._gen5adjacentseeds_result_ptr();
    const resultBytes =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer + resultBytes > module.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 5 Adjacent Seeds result pointer is invalid.");
    }
    const copied = module.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    post(
      {
        type: "batch",
        moduleId: "gen5adjacentseeds",
        apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: message.chunkIndex,
        processedCount: module._gen5adjacentseeds_processed_count(),
        resultCount,
        elapsedMs: performance.now() - startedAt,
        buffer: copied.buffer,
      },
      [copied.buffer],
    );
  } finally {
    module._free(requestPointer);
  }
}

function preview(
  module: Gen5AdjacentSeedsEmscriptenModule,
  message: Extract<Gen5AdjacentSeedsWorkerRequest, { type: "task" }>,
) {
  if (
    message.request.kind !== "preview" ||
    message.chunk.kind !== "preview" ||
    message.chunkIndex !== 0 ||
    message.chunk.index !== 0
  ) {
    throw new TypeError("Invalid Gen 5 Adjacent Seeds preview task.");
  }
  const request = validateGen5AdjacentPreviewRequest(message.request.value);
  const [seedLow, seedHigh] = splitHex(request.seed);
  const outputPointer = module._malloc(GEN5_ADJACENT_SEEDS_PREVIEW_COUNT);
  if (outputPointer === 0)
    throw new Error("Gen 5 Adjacent Seeds preview allocation failed.");
  try {
    if (
      outputPointer + GEN5_ADJACENT_SEEDS_PREVIEW_COUNT >
      module.HEAPU8.byteLength
    ) {
      throw new RangeError("Gen 5 Adjacent Seeds preview exceeds memory.");
    }
    const startedAt = performance.now();
    const count = module._gen5adjacentseeds_preview(
      seedLow,
      seedHigh,
      request.pidAdvance,
      request.mode === "chatot" ? 1 : 0,
      outputPointer,
      GEN5_ADJACENT_SEEDS_PREVIEW_COUNT,
    );
    const error = module._gen5adjacentseeds_last_error();
    if (error !== 0 || count !== GEN5_ADJACENT_SEEDS_PREVIEW_COUNT)
      throw new Error("Gen 5 Adjacent Seeds Wasm preview failed.");
    const copied = module.HEAPU8.slice(outputPointer, outputPointer + count);
    post(
      {
        type: "batch",
        moduleId: "gen5adjacentseeds",
        apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
        taskId: message.taskId,
        operation: "generator",
        chunkIndex: 0,
        processedCount: count,
        resultCount: count,
        elapsedMs: performance.now() - startedAt,
        buffer: copied.buffer,
      },
      [copied.buffer],
    );
  } finally {
    module._free(outputPointer);
  }
}

function run(
  message: Extract<Gen5AdjacentSeedsWorkerRequest, { type: "task" }>,
) {
  if (!wasm) throw new Error("Gen 5 Adjacent Seeds Wasm is not initialized.");
  if (
    message.moduleId !== "gen5adjacentseeds" ||
    message.apiVersion !== GEN5_ADJACENT_SEEDS_API_VERSION ||
    message.operation !== "generator" ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0
  ) {
    throw new TypeError("Invalid Gen 5 Adjacent Seeds Worker task.");
  }
  if (message.request.kind === "generate") generate(wasm, message);
  else preview(wasm, message);
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen5AdjacentSeedsWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5adjacentseeds",
      apiVersion: GEN5_ADJACENT_SEEDS_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      code: data.type === "init" ? "initialization_failed" : "generate_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
