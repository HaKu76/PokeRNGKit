/// <reference lib="webworker" />

import {
  GEN3_PID_TO_IV_API_VERSION,
  GEN3_PID_TO_IV_RESULT_WORDS,
} from "../domain";
import type {
  Gen3PidToIvWorkerRequest,
  Gen3PidToIvWorkerResponse,
} from "./messages";

interface Module {
  HEAPU32: Uint32Array;
  _gen3pidtoiv_api_version(): number;
  _gen3pidtoiv_calculate(pid: number): number;
  _gen3pidtoiv_result_ptr(): number;
  _gen3pidtoiv_result_count(): number;
  _gen3pidtoiv_last_error(): number;
}

type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Module>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Module | undefined;

function post(
  message: Gen3PidToIvWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen3 PID to IVs Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3pidtoiv_api_version();
  if (apiVersion !== GEN3_PID_TO_IV_API_VERSION) {
    throw new Error(
      `Gen3 PID to IVs Wasm API ${apiVersion} does not match UI API ${GEN3_PID_TO_IV_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3PidToIvWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 PID to IVs Wasm module is not initialized.");
  const startedAt = performance.now();
  const resultCount = wasm._gen3pidtoiv_calculate(message.request.pid);
  if (wasm._gen3pidtoiv_last_error() !== 0) {
    throw new Error("Gen3 PID to IVs Wasm core rejected the request.");
  }
  if (resultCount !== wasm._gen3pidtoiv_result_count()) {
    throw new Error("Gen3 PID to IVs result count changed before copying.");
  }
  const bytePointer = wasm._gen3pidtoiv_result_ptr();
  const wordCount = resultCount * GEN3_PID_TO_IV_RESULT_WORDS;
  if (
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + wordCount >
      wasm.HEAPU32.length
  ) {
    throw new RangeError(
      "Gen3 PID to IVs core returned an invalid result range.",
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

scope.onmessage = async ({ data }: MessageEvent<Gen3PidToIvWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "run" ? data.taskId : undefined,
      code:
        data.type === "run" ? "calculation_failed" : "initialization_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
