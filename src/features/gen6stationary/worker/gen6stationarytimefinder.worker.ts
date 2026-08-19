/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6StationaryRequest,
  GEN6_STATIONARY_API_VERSION,
  GEN6_STATIONARY_REQUEST_WORDS,
  GEN6_STATIONARY_RESULT_WORDS,
} from "../domain";
import {
  GEN6_STATIONARY_TIME_API_VERSION,
  GEN6_STATIONARY_TIME_RESULT_WORDS,
  gen6StationaryTimeTaskCount,
  validateGen6StationaryTimeRequest,
} from "../timeDomain";
import type {
  Gen6StationaryTimeWorkerRequest,
  Gen6StationaryTimeWorkerResponse,
  Gen6StationaryTimeWorkerTask,
} from "./timeMessages";
interface TimeModule {
  _gen6timefinder_api_version(): number;
  _gen6timefinder_initial_seed(
    save: number,
    time: number,
    low: number,
    high: number,
  ): number;
}
interface StationaryModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6stationary_api_version(): number;
  _gen6stationary_generate(pointer: number): number;
  _gen6stationary_result_ptr(): number;
  _gen6stationary_result_count(): number;
  _gen6stationary_last_error(): number;
  _gen6stationary_limit_reached(): number;
}
type Factory<T> = (options: { locateFile(file: string): string }) => Promise<T>;
const scope = self as DedicatedWorkerGlobalScope;
let timeModule: TimeModule | undefined;
let stationary: StationaryModule | undefined;
let activeTaskId: string | undefined;
function post(
  message: Gen6StationaryTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function init(
  message: Extract<Gen6StationaryTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_STATIONARY_TIME_API_VERSION
  )
    throw new Error("Gen VI Stationary Time Finder Worker contract mismatch.");
  const timeNs = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory<TimeModule>;
  };
  const stationaryNs = (await import(
    /* @vite-ignore */ message.stationaryModuleUrl
  )) as { default?: Factory<StationaryModule> };
  if (
    typeof timeNs.default !== "function" ||
    typeof stationaryNs.default !== "function"
  )
    throw new TypeError("Gen VI Time Finder Wasm factory is missing.");
  const locate = (file: string, source: string) => new URL(file, source).href;
  timeModule = await timeNs.default({
    locateFile: (file) => locate(file, message.moduleUrl),
  });
  stationary = await stationaryNs.default({
    locateFile: (file) => locate(file, message.stationaryModuleUrl),
  });
  if (
    timeModule._gen6timefinder_api_version() !==
      GEN6_STATIONARY_TIME_API_VERSION ||
    stationary._gen6stationary_api_version() !== GEN6_STATIONARY_API_VERSION
  )
    throw new Error("Gen VI Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen6timefinder",
    apiVersion: GEN6_STATIONARY_TIME_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["stationary-time-search"],
  });
}
function run(message: Gen6StationaryTimeWorkerTask) {
  if (!timeModule || !stationary)
    throw new Error("Gen VI Time Finder Wasm is unavailable.");
  if (activeTaskId)
    throw new Error("A Gen VI Time Finder task is already running.");
  const request = validateGen6StationaryTimeRequest(message.request);
  gen6StationaryTimeTaskCount(request);
  Math.max(1, Math.min(65536, message.stepSize));
  activeTaskId = message.taskId;
  let batchIndex = 0;
  let processed = 0;
  let totalResults = 0;
  let limited = false;
  try {
    for (
      let epoch = request.startEpoch;
      epoch <= request.endEpoch && activeTaskId === message.taskId;
      epoch += 1000n
    ) {
      const low = Number(epoch & 0xffff_ffffn);
      const high = Number((epoch >> 32n) & 0xffff_ffffn);
      const seed = timeModule._gen6timefinder_initial_seed(
        request.saveVariable,
        request.timeVariable,
        low,
        high,
      );
      const packedRequest = encodeGen6StationaryRequest({
        ...request,
        seed,
        resultLimit: request.resultLimit - totalResults,
      });
      if (packedRequest.length !== GEN6_STATIONARY_REQUEST_WORDS)
        throw new Error(
          "Gen VI Stationary request packing changed unexpectedly.",
        );
      const pointer = stationary._malloc(packedRequest.byteLength);
      if (!pointer)
        throw new Error("Gen VI Stationary Wasm allocation failed.");
      let count = 0;
      let copied = new Uint32Array();
      try {
        stationary.HEAPU32.set(packedRequest, pointer >>> 2);
        count = stationary._gen6stationary_generate(pointer);
        if (
          stationary._gen6stationary_last_error() !== 0 ||
          count !== stationary._gen6stationary_result_count()
        )
          throw new Error("Gen VI Stationary Wasm returned an error.");
        const resultPointer = stationary._gen6stationary_result_ptr();
        copied = count
          ? stationary.HEAPU32.slice(
              resultPointer >>> 2,
              (resultPointer >>> 2) + count * GEN6_STATIONARY_RESULT_WORDS,
            )
          : new Uint32Array();
        limited ||= stationary._gen6stationary_limit_reached() === 1;
      } finally {
        stationary._free(pointer);
      }
      const packed = new Uint32Array(count * GEN6_STATIONARY_TIME_RESULT_WORDS);
      for (let index = 0; index < count; index++) {
        const source = index * GEN6_STATIONARY_RESULT_WORDS;
        const target = index * GEN6_STATIONARY_TIME_RESULT_WORDS;
        packed.set(
          copied.subarray(source, source + GEN6_STATIONARY_RESULT_WORDS),
          target,
        );
        packed[target + 16] = seed;
        packed[target + 17] = low;
        packed[target + 18] = high;
      }
      processed += request.maxFrame - request.minFrame + 1;
      totalResults += count;
      if (count)
        post(
          {
            type: "batch",
            moduleId: "gen6timefinder",
            apiVersion: GEN6_STATIONARY_TIME_API_VERSION,
            taskId: message.taskId,
            operation: "stationary-time-search",
            batchIndex: batchIndex++,
            buffer: packed.buffer,
            resultCount: count,
            totalProcessed: processed,
            totalResultCount: totalResults,
            done: false,
            limitReached: limited,
          },
          [packed.buffer],
        );
      if (totalResults >= request.resultLimit) {
        limited ||= epoch < request.endEpoch;
        break;
      }
    }
    post(
      {
        type: "batch",
        moduleId: "gen6timefinder",
        apiVersion: GEN6_STATIONARY_TIME_API_VERSION,
        taskId: message.taskId,
        operation: "stationary-time-search",
        batchIndex: batchIndex++,
        buffer: new ArrayBuffer(0),
        resultCount: 0,
        totalProcessed: processed,
        totalResultCount: totalResults,
        done: true,
        limitReached: limited,
      },
      [],
    );
  } finally {
    activeTaskId = undefined;
  }
}
scope.onmessage = async ({
  data,
}: MessageEvent<Gen6StationaryTimeWorkerRequest>) => {
  try {
    if (data.type === "init") await init(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6timefinder",
      apiVersion: GEN6_STATIONARY_TIME_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    activeTaskId = undefined;
  }
};
