/// <reference lib="webworker" />

import { GEN3_JIRACHI_API_VERSION } from "../domain";
import type {
  Gen3JirachiWorkerRequest,
  Gen3JirachiWorkerResponse,
} from "./messages";

interface Module {
  HEAPU32: Uint32Array;
  _gen3jirachi_api_version(): number;
  _gen3jirachi_calculate(
    startingSeed: number,
    targetSeed: number,
    maxAdvances: number,
    bruteForceRange: number,
  ): number;
  _gen3jirachi_target_advances(): number;
  _gen3jirachi_result_ptr(): number;
  _gen3jirachi_result_count(): number;
  _gen3jirachi_last_error(): number;
}

type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Module>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Module | undefined;

function post(
  message: Gen3JirachiWorkerResponse,
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
      "Gen3 Jirachi Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3jirachi_api_version();
  if (apiVersion !== GEN3_JIRACHI_API_VERSION) {
    throw new Error(
      `Gen3 Jirachi Wasm API ${apiVersion} does not match UI API ${GEN3_JIRACHI_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(message: Extract<Gen3JirachiWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("Gen3 Jirachi Wasm module is not initialized.");
  const startedAt = performance.now();
  const { startingSeed, targetSeed, maxAdvances, bruteForceRange } =
    message.request;
  const resultCount = wasm._gen3jirachi_calculate(
    startingSeed,
    targetSeed,
    maxAdvances,
    bruteForceRange,
  );
  if (resultCount !== wasm._gen3jirachi_result_count()) {
    throw new Error("Gen3 Jirachi result count changed before copying.");
  }
  const bytePointer = wasm._gen3jirachi_result_ptr();
  if (
    bytePointer % Uint32Array.BYTES_PER_ELEMENT !== 0 ||
    bytePointer / Uint32Array.BYTES_PER_ELEMENT + resultCount >
      wasm.HEAPU32.length
  ) {
    throw new RangeError("Gen3 Jirachi core returned an invalid result range.");
  }
  const pointer = bytePointer / Uint32Array.BYTES_PER_ELEMENT;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultCount);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      resultCount,
      targetAdvances: wasm._gen3jirachi_target_advances(),
      errorCode: wasm._gen3jirachi_last_error(),
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

scope.onmessage = async ({ data }: MessageEvent<Gen3JirachiWorkerRequest>) => {
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
