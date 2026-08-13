/// <reference lib="webworker" />

import {
  GEN4_SEED_TO_TIME_API_VERSION,
  GEN4_SEED_TO_TIME_CALIBRATION_WORDS,
  GEN4_SEED_TO_TIME_RESULT_WORDS,
  gen4RoamerMask,
} from "../domain";
import type {
  Gen4SeedToTimeWorkerRequest,
  Gen4SeedToTimeWorkerResponse,
} from "./messages";

interface Gen4SeedToTimeModule {
  HEAPU32: Uint32Array;
  _gen4seedtotime_api_version(): number;
  _gen4seedtotime_generate(...values: number[]): number;
  _gen4seedtotime_calibrate(...values: number[]): number;
  _gen4seedtotime_result_ptr(): number;
  _gen4seedtotime_result_count(): number;
  _gen4seedtotime_calibration_ptr(): number;
  _gen4seedtotime_calibration_count(): number;
  _gen4seedtotime_status_sequence_low(): number;
  _gen4seedtotime_status_sequence_high(): number;
  _gen4seedtotime_status_raikou_route(): number;
  _gen4seedtotime_status_entei_route(): number;
  _gen4seedtotime_status_lati_route(): number;
  _gen4seedtotime_status_skips(): number;
  _gen4seedtotime_last_error(): number;
}

type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen4SeedToTimeModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen4SeedToTimeModule | undefined;

function post(
  message: Gen4SeedToTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "Gen4 Seed to Time Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen4seedtotime_api_version();
  if (apiVersion !== GEN4_SEED_TO_TIME_API_VERSION)
    throw new Error(
      `Gen4 Seed to Time Wasm API ${apiVersion} does not match UI API ${GEN4_SEED_TO_TIME_API_VERSION}.`,
    );
  post({ type: "ready", apiVersion });
}

function copyBuffer(pointer: number, count: number, wordsPerResult: number) {
  if (!wasm) throw new Error("Gen4 Seed to Time Wasm is not initialized.");
  const wordCount = count * wordsPerResult;
  if (
    pointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    pointer / Uint32Array.BYTES_PER_ELEMENT + wordCount > wasm.HEAPU32.length
  )
    throw new RangeError("Gen4 Seed to Time core returned an invalid range.");
  const start = pointer / Uint32Array.BYTES_PER_ELEMENT;
  return wasm.HEAPU32.slice(start, start + wordCount).buffer;
}

function runGenerate(
  message: Extract<Gen4SeedToTimeWorkerRequest, { type: "generate" }>,
) {
  if (!wasm) throw new Error("Gen4 Seed to Time Wasm is not initialized.");
  const startedAt = performance.now();
  const { request } = message;
  const resultCount = wasm._gen4seedtotime_generate(
    request.seed,
    request.year,
    request.forceSecond ? 1 : 0,
    request.second,
    request.mode === "hgss" ? 1 : 0,
    gen4RoamerMask(request),
    request.raikou.route,
    request.entei.route,
    request.lati.route,
  );
  if (wasm._gen4seedtotime_last_error() !== 0)
    throw new Error("Gen4 Seed to Time Wasm core rejected the request.");
  if (resultCount !== wasm._gen4seedtotime_result_count())
    throw new Error("Gen4 Seed to Time result count changed before copying.");
  const buffer = copyBuffer(
    wasm._gen4seedtotime_result_ptr(),
    resultCount,
    GEN4_SEED_TO_TIME_RESULT_WORDS,
  );
  post(
    {
      type: "generated",
      taskId: message.taskId,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      status: {
        sequenceLow: wasm._gen4seedtotime_status_sequence_low(),
        sequenceHigh: wasm._gen4seedtotime_status_sequence_high(),
        raikouRoute: wasm._gen4seedtotime_status_raikou_route(),
        enteiRoute: wasm._gen4seedtotime_status_entei_route(),
        latiRoute: wasm._gen4seedtotime_status_lati_route(),
        skips: wasm._gen4seedtotime_status_skips(),
      },
      buffer,
    },
    [buffer],
  );
}

function runCalibration(
  message: Extract<Gen4SeedToTimeWorkerRequest, { type: "calibrate" }>,
) {
  if (!wasm) throw new Error("Gen4 Seed to Time Wasm is not initialized.");
  const startedAt = performance.now();
  const { request } = message;
  const { target } = request;
  const resultCount = wasm._gen4seedtotime_calibrate(
    target.year,
    target.month,
    target.day,
    target.hour,
    target.minute,
    target.second,
    target.delay,
    request.delayCalibration,
    request.secondCalibration,
    request.mode === "hgss" ? 1 : 0,
    gen4RoamerMask(request),
    request.raikou.route,
    request.entei.route,
    request.lati.route,
  );
  const errorCode = wasm._gen4seedtotime_last_error();
  if (errorCode !== 0)
    throw new Error(
      errorCode === 2
        ? "Gen4 Seed to Time calibration result limit exceeded."
        : "Gen4 Seed to Time Wasm core rejected the calibration request.",
    );
  if (resultCount !== wasm._gen4seedtotime_calibration_count())
    throw new Error(
      "Gen4 Seed to Time calibration count changed before copying.",
    );
  const buffer = copyBuffer(
    wasm._gen4seedtotime_calibration_ptr(),
    resultCount,
    GEN4_SEED_TO_TIME_CALIBRATION_WORDS,
  );
  post(
    {
      type: "calibrated",
      taskId: message.taskId,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer,
    },
    [buffer],
  );
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen4SeedToTimeWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else if (data.type === "generate") runGenerate(data);
    else runCalibration(data);
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
