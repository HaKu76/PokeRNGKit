/// <reference lib="webworker" />

import { GEN3_INITIAL_SEED_API_VERSION } from "../domain";
import type {
  Gen3InitialSeedWorkerRequest,
  Gen3InitialSeedWorkerResponse,
} from "./messages";

interface Gen3InitialSeedEmscriptenModule {
  HEAPU32: Uint32Array;
  _gen3initialseed_api_version(): number;
  _gen3initialseed_find_rs_ids(tid: number, sid: number): number;
  _gen3initialseed_find_target(
    targetSeed: number,
    startAdvance: number,
    stateCount: number,
  ): number;
  _gen3initialseed_result_ptr(): number;
  _gen3initialseed_result_count(): number;
  _gen3initialseed_last_error(): number;
}

type Gen3InitialSeedModuleFactory = (options: {
  locateFile(path: string): string;
}) => Promise<Gen3InitialSeedEmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Gen3InitialSeedEmscriptenModule | undefined;

function post(
  message: Gen3InitialSeedWorkerResponse,
  transfer: Transferable[] = [],
) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Gen3InitialSeedModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError(
      "Gen3 initial seed Wasm module does not export a default factory.",
    );
  }
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3initialseed_api_version();
  if (apiVersion !== GEN3_INITIAL_SEED_API_VERSION) {
    throw new Error(
      `Gen3 initial seed Wasm API ${apiVersion} does not match UI API ${GEN3_INITIAL_SEED_API_VERSION}.`,
    );
  }
  post({ type: "ready", apiVersion });
}

function run(
  message: Exclude<Gen3InitialSeedWorkerRequest, { type: "init" }>,
) {
  if (!wasm) {
    throw new Error("Gen3 initial seed Wasm module is not initialized.");
  }
  const startedAt = performance.now();
  const resultCount =
    message.type === "rs-ids"
      ? wasm._gen3initialseed_find_rs_ids(message.request.tid, message.request.sid)
      : wasm._gen3initialseed_find_target(
          message.request.targetSeed,
          message.chunk.startAdvance,
          message.chunk.stateCount,
        );
  const errorCode = wasm._gen3initialseed_last_error();
  if (errorCode !== 0) {
    throw new Error(
      `Gen3 initial seed Wasm core returned error ${errorCode}.`,
    );
  }
  if (resultCount !== wasm._gen3initialseed_result_count()) {
    throw new Error(
      "Gen3 initial seed Wasm result count changed before the buffer was copied.",
    );
  }
  const pointer = wasm._gen3initialseed_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultCount * 2);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.type === "rs-ids" ? 0 : message.chunk.index,
      stateCount: message.type === "rs-ids" ? 0x1_0000 : message.chunk.stateCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

workerScope.onmessage = async ({
  data,
}: MessageEvent<Gen3InitialSeedWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "init" ? undefined : data.taskId,
      chunkIndex: data.type === "target" ? data.chunk.index : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
