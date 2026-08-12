/// <reference lib="webworker" />

import {
  GEN3_IVTOPID_API_VERSION,
  GEN3_IVTOPID_MAX_RESULTS,
  GEN3_IVTOPID_RESULT_WORDS,
} from "../domain";
import type {
  Gen3IvToPidWorkerRequest,
  Gen3IvToPidWorkerResponse,
} from "./messages";

interface Gen3IvToPidModule {
  HEAPU32: Uint32Array;
  _gen3ivtopid_api_version(): number;
  _gen3ivtopid_calculate(
    hp: number,
    atk: number,
    def: number,
    spa: number,
    spd: number,
    spe: number,
    nature: number,
    tid: number,
  ): number;
  _gen3ivtopid_result_ptr(): number;
  _gen3ivtopid_result_count(): number;
  _gen3ivtopid_last_error(): number;
}

type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3IvToPidModule>;
const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3IvToPidModule | undefined;

function post(
  message: Gen3IvToPidWorkerResponse,
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
      "Gen3 IVs to PID Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3ivtopid_api_version();
  if (apiVersion !== GEN3_IVTOPID_API_VERSION) {
    throw new Error(
      `Gen3 IVs to PID Wasm API ${apiVersion} does not match UI API ${GEN3_IVTOPID_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3IvToPidWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 IVs to PID Wasm module is not initialized.");
  const startedAt = performance.now();
  const request = message.request;
  const resultCount = wasm._gen3ivtopid_calculate(
    request.hp,
    request.atk,
    request.def,
    request.spa,
    request.spd,
    request.spe,
    request.nature,
    request.tid,
  );
  const errorCode = wasm._gen3ivtopid_last_error();
  if (errorCode !== 0)
    throw new Error(`Gen3 IVs to PID Wasm core returned error ${errorCode}.`);
  if (resultCount !== wasm._gen3ivtopid_result_count())
    throw new Error("Gen3 IVs to PID result count changed before copying.");
  if (resultCount > GEN3_IVTOPID_MAX_RESULTS) {
    throw new RangeError("Gen3 IVs to PID core exceeded its result limit.");
  }
  const bytePointer = wasm._gen3ivtopid_result_ptr();
  const wordCount = resultCount * GEN3_IVTOPID_RESULT_WORDS;
  if (
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + wordCount >
      wasm.HEAPU32.length
  ) {
    throw new RangeError(
      "Gen3 IVs to PID core returned an invalid result range.",
    );
  }
  const pointer = bytePointer / Uint32Array.BYTES_PER_ELEMENT;
  const words = wasm.HEAPU32.slice(pointer, pointer + wordCount);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3IvToPidWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
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
