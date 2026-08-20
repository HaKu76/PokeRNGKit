/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  decodeGen6MtSeedTimeResults,
  encodeGen6MtSeedTimeRequest,
  GEN6_MT_SEED_TIME_API_VERSION,
  GEN6_MT_SEED_TIME_REQUEST_WORDS,
  GEN6_MT_SEED_TIME_RESULT_WORDS,
} from "../domain";
import type {
  Gen6MtSeedTimeWorkerRequest,
  Gen6MtSeedTimeWorkerResponse,
} from "./messages";
interface Wasm {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6mtseedtime_api_version(): number;
  _gen6mtseedtime_begin(pointer: number): number;
  _gen6mtseedtime_step(maximumStates: number): number;
  _gen6mtseedtime_result_ptr(): number;
  _gen6mtseedtime_result_count(): number;
  _gen6mtseedtime_step_processed(): number;
  _gen6mtseedtime_total_processed(): number;
  _gen6mtseedtime_done(): number;
  _gen6mtseedtime_limit_reached(): number;
  _gen6mtseedtime_last_error(): number;
}
type Factory = (options: { locateFile(file: string): string }) => Promise<Wasm>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Wasm | undefined;
function post(
  message: Gen6MtSeedTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function init(
  message: Extract<Gen6MtSeedTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen6mtseedtime" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_MT_SEED_TIME_API_VERSION
  )
    throw new Error("Gen VI MT Seed Time Worker contract mismatch.");
  const imported = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory;
  };
  if (typeof imported.default !== "function")
    throw new TypeError("Gen VI MT Seed Time Wasm factory is missing.");
  wasm = await imported.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (wasm._gen6mtseedtime_api_version() !== GEN6_MT_SEED_TIME_API_VERSION)
    throw new Error("Gen VI MT Seed Time Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen6mtseedtime",
    apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["searcher"],
  });
}
function run(message: Extract<Gen6MtSeedTimeWorkerRequest, { type: "task" }>) {
  const module = wasm;
  if (!module) throw new Error("Gen VI MT Seed Time Wasm is not initialized.");
  const request = encodeGen6MtSeedTimeRequest(message.request);
  if (request.length !== GEN6_MT_SEED_TIME_REQUEST_WORDS)
    throw new Error("Gen VI MT Seed Time request packing changed.");
  const pointer = module._malloc(request.byteLength);
  if (!pointer) throw new Error("Gen VI MT Seed Time Wasm allocation failed.");
  try {
    module.HEAPU32.set(request, pointer >>> 2);
    if (
      module._gen6mtseedtime_begin(pointer) !== 1 ||
      module._gen6mtseedtime_last_error() !== 0
    )
      throw new Error("Gen VI MT Seed Time Wasm begin failed.");
  } finally {
    module._free(pointer);
  }
  let totalResults = 0;
  const step = () => {
    try {
      module._gen6mtseedtime_step(message.stepSize);
      if (module._gen6mtseedtime_last_error() !== 0)
        throw new Error("Gen VI MT Seed Time Wasm step failed.");
      const count = module._gen6mtseedtime_result_count();
      const pointerValue = module._gen6mtseedtime_result_ptr();
      const words = count * GEN6_MT_SEED_TIME_RESULT_WORDS;
      if (
        count > message.stepSize ||
        module._gen6mtseedtime_step_processed() > message.stepSize ||
        (count > 0 &&
          (!pointerValue ||
            pointerValue + words * 4 > module.HEAPU32.byteLength))
      )
        throw new RangeError("Gen VI MT Seed Time result pointer is invalid.");
      const raw = count
        ? module.HEAPU32.slice(pointerValue >>> 2, (pointerValue >>> 2) + words)
        : new Uint32Array();
      const batch = decodeGen6MtSeedTimeResults(raw.buffer);
      totalResults += batch.length;
      const done =
        module._gen6mtseedtime_done() === 1 ||
        module._gen6mtseedtime_limit_reached() === 1;
      const buffer = raw.buffer;
      post(
        {
          type: "batch",
          moduleId: "gen6mtseedtime",
          apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
          taskId: message.taskId,
          buffer,
          resultCount: batch.length,
          totalProcessed: module._gen6mtseedtime_total_processed(),
          totalResultCount: totalResults,
          done,
          limitReached: module._gen6mtseedtime_limit_reached() === 1,
        },
        [buffer],
      );
      if (!done) setTimeout(step, 0);
    } catch (error) {
      post({
        type: "error",
        moduleId: "gen6mtseedtime",
        apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
        taskId: message.taskId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
  step();
}
scope.onmessage = async ({
  data,
}: MessageEvent<Gen6MtSeedTimeWorkerRequest>) => {
  try {
    if (data.type === "init") await init(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6mtseedtime",
      apiVersion: GEN6_MT_SEED_TIME_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
