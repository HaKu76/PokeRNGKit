/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  GEN5_DREAM_RADAR_API_VERSION,
  validateGen5DreamRadarRequest,
  type Gen5DreamRadarRequest,
} from "../domain";
import type {
  Gen5DreamRadarWorkerRequest,
  Gen5DreamRadarWorkerResponse,
} from "./messages";

const REQUEST_WORDS = 60;
const RESULT_WORDS = 11;

interface Gen5DreamRadarEmscriptenModule {
  HEAPU8: Uint8Array;
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen5dreamradar_api_version(): number;
  _gen5dreamradar_search(requestPointer: number): number;
  _gen5dreamradar_result_ptr(): number;
  _gen5dreamradar_result_count(): number;
  _gen5dreamradar_processed_count(): number;
  _gen5dreamradar_limit_reached(): number;
  _gen5dreamradar_last_error(): number;
}

type Factory = (options: {
  locateFile(file: string): string;
}) => Promise<Gen5DreamRadarEmscriptenModule>;

const scope = self as DedicatedWorkerGlobalScope;
let wasm: Gen5DreamRadarEmscriptenModule | undefined;

function post(
  message: Gen5DreamRadarWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function indexed<T extends string>(values: readonly T[], value: T) {
  const index = values.indexOf(value);
  if (index < 0)
    throw new TypeError(`Unsupported Dream Radar value: ${value}.`);
  return index;
}

function splitHex(value: string) {
  const parsed = BigInt(`0x${value || "0"}`);
  return [Number(parsed & 0xffff_ffffn), Number(parsed >> 32n)] as const;
}

function dateParts(value: string) {
  return value.split("-").map(Number) as [number, number, number];
}

function packRequest(
  request: Gen5DreamRadarRequest,
  chunk: { start: number; count: number },
) {
  const words = new Uint32Array(REQUEST_WORDS);
  const [macLow, macHigh] = splitHex(request.profile.mac);
  const values = [
    request.mode === "generator" ? 0 : 1,
    indexed(["black2", "white2"] as const, request.profile.version) + 2,
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
      request.profile.language,
    ),
    indexed(["ds", "dsi", "3ds"] as const, request.profile.dsType),
    macLow,
    macHigh,
    request.profile.vcount,
    request.profile.timer0Min,
    request.profile.timer0Max,
    request.profile.gxstat,
    request.profile.vframe,
    request.profile.keypresses.reduce(
      (mask, enabled, index) => mask | (enabled ? 1 << index : 0),
      0,
    ),
    request.profile.skipLR ? 1 : 0,
    request.profile.memoryLink ? 1 : 0,
    request.initialAdvances,
    request.maxAdvances,
    request.badges,
    request.resultLimit,
    request.profile.tid,
    request.profile.sid,
    request.slots.length,
    ...Array.from(
      { length: 6 },
      (_, index) => request.slots[index]?.encounter ?? 0,
    ),
    ...Array.from(
      { length: 6 },
      (_, index) => request.slots[index]?.gender ?? 2,
    ),
    request.filters.disabled ? 1 : 0,
    ...request.filters.ivMin,
    ...request.filters.ivMax,
    request.filters.natureMask,
    request.filters.hiddenPowerMask,
    request.filters.perfectIvValue,
    request.filters.perfectIvCount,
    ...(request.mode === "generator" ? [...splitHex(request.seed)] : [0, 0]),
    ...(request.mode === "searcher"
      ? [...dateParts(request.startDate), ...dateParts(request.endDate)]
      : [0, 0, 0, 0, 0, 0]),
    chunk.start,
    chunk.count,
  ];
  if (values.length !== REQUEST_WORDS)
    throw new Error("Dream Radar request packing changed unexpectedly.");
  words.set(values.map((value) => value >>> 0));
  return words;
}

async function initialize(
  message: Extract<Gen5DreamRadarWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen5dreamradar" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN5_DREAM_RADAR_API_VERSION
  ) {
    throw new Error("Dream Radar Worker contract mismatch.");
  }
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Dream Radar Wasm module has no default factory.");
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  const apiVersion = wasm._gen5dreamradar_api_version();
  if (apiVersion !== GEN5_DREAM_RADAR_API_VERSION)
    throw new Error(
      `Dream Radar Wasm API ${apiVersion} does not match the UI.`,
    );
  post({
    type: "ready",
    moduleId: "gen5dreamradar",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion,
    operations: ["generator", "searcher"],
  });
}

function search(
  message: Extract<Gen5DreamRadarWorkerRequest, { type: "task" }>,
) {
  if (!wasm) throw new Error("Dream Radar Wasm module is not initialized.");
  if (
    message.moduleId !== "gen5dreamradar" ||
    message.apiVersion !== GEN5_DREAM_RADAR_API_VERSION ||
    message.operation !== message.request.mode ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunk.index !== message.chunkIndex ||
    !Number.isInteger(message.chunk.start) ||
    !Number.isInteger(message.chunk.count) ||
    message.chunk.start < 0 ||
    message.chunk.count < 1
  ) {
    throw new TypeError("Invalid Dream Radar Worker task.");
  }
  validateGen5DreamRadarRequest(message.request);
  const request = packRequest(message.request, message.chunk);
  const requestPointer = wasm._malloc(request.byteLength);
  if (requestPointer === 0)
    throw new Error("Dream Radar Wasm allocation failed.");
  try {
    if ((requestPointer & 3) !== 0)
      throw new Error("Dream Radar Wasm request pointer is not aligned.");
    if (requestPointer + request.byteLength > wasm.HEAPU8.byteLength)
      throw new RangeError("Dream Radar Wasm request exceeds memory.");
    wasm.HEAPU32.set(request, requestPointer >>> 2);
    const resultCount = wasm._gen5dreamradar_search(requestPointer);
    const error = wasm._gen5dreamradar_last_error();
    if (error !== 0)
      throw new Error(`Dream Radar Wasm returned error ${error}.`);
    if (
      !Number.isInteger(resultCount) ||
      resultCount < 0 ||
      resultCount > message.request.resultLimit ||
      resultCount !== wasm._gen5dreamradar_result_count()
    ) {
      throw new Error("Dream Radar Wasm returned an invalid result count.");
    }
    const resultPointer = wasm._gen5dreamradar_result_ptr();
    const byteLength =
      resultCount * RESULT_WORDS * Uint32Array.BYTES_PER_ELEMENT;
    if (
      (resultCount !== 0 && resultPointer === 0) ||
      (resultPointer & 3) !== 0 ||
      resultPointer < 0 ||
      resultPointer + byteLength > wasm.HEAPU8.byteLength
    ) {
      throw new RangeError("Dream Radar Wasm result pointer is invalid.");
    }
    const copied = wasm.HEAPU32.slice(
      resultPointer >>> 2,
      (resultPointer >>> 2) + resultCount * RESULT_WORDS,
    );
    const processed = wasm._gen5dreamradar_processed_count();
    const limitReached = wasm._gen5dreamradar_limit_reached() === 1;
    if (
      !Number.isSafeInteger(processed) ||
      processed < 0 ||
      processed > message.chunk.count ||
      (!limitReached && processed !== message.chunk.count)
    ) {
      throw new Error("Dream Radar Wasm returned an invalid processed count.");
    }
    post(
      {
        type: "batch",
        moduleId: "gen5dreamradar",
        apiVersion: GEN5_DREAM_RADAR_API_VERSION,
        taskId: message.taskId,
        operation: message.operation,
        chunkIndex: message.chunkIndex,
        processedCount: processed,
        resultCount,
        limitReached,
        buffer: copied.buffer,
      },
      [copied.buffer],
    );
  } finally {
    wasm._free(requestPointer);
  }
}

scope.onmessage = async ({
  data,
}: MessageEvent<Gen5DreamRadarWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else search(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen5dreamradar",
      apiVersion: GEN5_DREAM_RADAR_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      chunkIndex: data.type === "task" ? data.chunkIndex : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
