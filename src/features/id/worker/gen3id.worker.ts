/// <reference lib="webworker" />

import { ID3_API_VERSION, id3FilterFlags, id3ModeToWasm } from "../domain";
import type { Id3WorkerRequest, Id3WorkerResponse } from "./messages";

interface Id3EmscriptenModule {
  HEAPU32: Uint32Array;
  _gen3id_api_version(): number;
  _gen3id_generate(
    mode: number,
    input: number,
    initialAdvances: number,
    maxAdvances: number,
    filterFlags: number,
    tid: number,
    sid: number,
    tsv: number,
  ): number;
  _gen3id_result_ptr(): number;
  _gen3id_result_count(): number;
  _gen3id_last_error(): number;
}

type Id3ModuleFactory = (options: {
  locateFile(path: string): string;
}) => Promise<Id3EmscriptenModule>;

const workerScope = self as DedicatedWorkerGlobalScope;
let wasm: Id3EmscriptenModule | undefined;

function post(message: Id3WorkerResponse, transfer: Transferable[] = []) {
  workerScope.postMessage(message, transfer);
}

async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Id3ModuleFactory;
  };
  if (typeof namespace.default !== "function") {
    throw new TypeError("ID3 Wasm module does not export a default factory.");
  }

  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });

  const apiVersion = wasm._gen3id_api_version();
  if (apiVersion !== ID3_API_VERSION) {
    throw new Error(
      `ID3 Wasm API ${apiVersion} does not match UI API ${ID3_API_VERSION}.`,
    );
  }

  post({ type: "ready", apiVersion });
}

function run(message: Extract<Id3WorkerRequest, { type: "run" }>) {
  if (!wasm) {
    throw new Error("ID3 Wasm module is not initialized.");
  }

  const startedAt = performance.now();
  const resultCount = wasm._gen3id_generate(
    id3ModeToWasm(message.mode),
    message.input,
    message.chunk.initialAdvances,
    message.chunk.maxAdvances,
    id3FilterFlags(message.filters),
    message.filters.tid ?? 0,
    message.filters.sid ?? 0,
    message.filters.tsv ?? 0,
  );
  const errorCode = wasm._gen3id_last_error();
  if (errorCode !== 0) {
    throw new Error(`ID3 Wasm core returned error ${errorCode}.`);
  }
  if (resultCount !== wasm._gen3id_result_count()) {
    throw new Error(
      "ID3 Wasm result count changed before the buffer was copied.",
    );
  }

  const pointer = wasm._gen3id_result_ptr() >>> 2;
  const words = wasm.HEAPU32.slice(pointer, pointer + resultCount * 3);
  post(
    {
      type: "batch",
      taskId: message.taskId,
      chunkIndex: message.chunk.index,
      stateCount: message.chunk.stateCount,
      resultCount,
      elapsedMs: performance.now() - startedAt,
      buffer: words.buffer,
    },
    [words.buffer],
  );
}

workerScope.onmessage = async ({ data }: MessageEvent<Id3WorkerRequest>) => {
  try {
    if (data.type === "init") {
      await initialize(data.moduleUrl);
    } else {
      run(data);
    }
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "run" ? data.taskId : undefined,
      chunkIndex: data.type === "run" ? data.chunk.index : undefined,
      code:
        data.type === "init" ? "initialization_failed" : "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
