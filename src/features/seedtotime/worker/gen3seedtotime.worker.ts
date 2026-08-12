/// <reference lib="webworker" />

import {
  GEN3_SEED_TO_TIME_API_VERSION,
  GEN3_SEED_TO_TIME_RESULT_WORDS,
} from "../domain";
import type {
  Gen3SeedToTimeWorkerRequest,
  Gen3SeedToTimeWorkerResponse,
} from "./messages";

interface Gen3SeedToTimeModule {
  HEAPU32: Uint32Array;
  _gen3seedtotime_api_version(): number;
  _gen3seedtotime_calculate(seed: number, year: number): number;
  _gen3seedtotime_origin_seed(): number;
  _gen3seedtotime_advances(): number;
  _gen3seedtotime_result_ptr(): number;
  _gen3seedtotime_result_count(): number;
  _gen3seedtotime_last_error(): number;
}

type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3SeedToTimeModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3SeedToTimeModule | undefined;

function post(
  message: Gen3SeedToTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen3 Seed to Time Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3seedtotime_api_version();
  if (apiVersion !== GEN3_SEED_TO_TIME_API_VERSION) {
    throw new Error(
      `Gen3 Seed to Time Wasm API ${apiVersion} does not match UI API ${GEN3_SEED_TO_TIME_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3SeedToTimeWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 Seed to Time Wasm module is not initialized.");
  const startedAt = performance.now();
  const resultCount = wasm._gen3seedtotime_calculate(
    message.request.seed,
    message.request.year,
  );
  if (wasm._gen3seedtotime_last_error() !== 0) {
    throw new Error("Gen3 Seed to Time Wasm core rejected the request.");
  }
  if (resultCount !== wasm._gen3seedtotime_result_count()) {
    throw new Error("Gen3 Seed to Time result count changed before copying.");
  }
  const bytePointer = wasm._gen3seedtotime_result_ptr();
  const wordCount = resultCount * GEN3_SEED_TO_TIME_RESULT_WORDS;
  if (
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + wordCount > wasm.HEAPU32.length
  ) {
    throw new RangeError("Gen3 Seed to Time core returned an invalid result range.");
  }
  const pointer = bytePointer / Uint32Array.BYTES_PER_ELEMENT;
  const words = wasm.HEAPU32.slice(pointer, pointer + wordCount);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      originSeed: wasm._gen3seedtotime_origin_seed(),
      advances: wasm._gen3seedtotime_advances(),
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3SeedToTimeWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      code: data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
