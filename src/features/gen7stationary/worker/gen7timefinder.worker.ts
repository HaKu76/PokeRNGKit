/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7StationaryRequest,
  GEN7_STATIONARY_API_VERSION,
  GEN7_STATIONARY_REQUEST_WORDS,
  GEN7_STATIONARY_RESULT_WORDS,
  GEN7_STATIONARY_TIME_RESULT_WORDS,
  GEN7_TIMEFINDER_API_VERSION,
  gen7StationaryTimeResultLimitReached,
  gen7StationaryTimeTaskCount,
  validateGen7StationaryTimeRequest,
} from "../domain";
import type {
  Gen7StationaryTimeWorkerRequest,
  Gen7StationaryTimeWorkerResponse,
  Gen7StationaryTimeWorkerTask,
} from "./timeMessages";

interface TimeFinderModule {
  _gen7timefinder_api_version(): number;
  _gen7timefinder_initial_seed(
    tick: number,
    epochLow: number,
    epochHigh: number,
  ): number;
}

interface StationaryModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7stationary_api_version(): number;
  _gen7stationary_begin(pointer: number): number;
  _gen7stationary_step(maximumStates: number): number;
  _gen7stationary_result_ptr(): number;
  _gen7stationary_result_count(): number;
  _gen7stationary_step_processed(): number;
  _gen7stationary_done(): number;
  _gen7stationary_limit_reached(): number;
  _gen7stationary_last_error(): number;
}

type Factory<T> = (options: { locateFile(file: string): string }) => Promise<T>;
const scope = self as DedicatedWorkerGlobalScope;
let timeFinder: TimeFinderModule | undefined;
let stationary: StationaryModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: Gen7StationaryTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function copyStationaryResults(count: number) {
  if (!stationary) throw new Error("Gen 7 Stationary Wasm is unavailable.");
  if (count !== stationary._gen7stationary_result_count())
    throw new Error("Gen 7 Stationary Wasm returned an invalid result count.");
  const pointer = stationary._gen7stationary_result_ptr();
  const words = count * GEN7_STATIONARY_RESULT_WORDS;
  if (
    (count !== 0 && pointer === 0) ||
    (pointer & 3) !== 0 ||
    pointer + words * 4 > stationary.HEAPU32.byteLength
  )
    throw new RangeError("Gen 7 Stationary Wasm result pointer is invalid.");
  return stationary.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + words);
}

async function initialize(
  message: Extract<Gen7StationaryTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7timefinder" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_TIMEFINDER_API_VERSION
  )
    throw new Error("Gen 7 Time Finder Worker contract mismatch.");
  const timeNamespace = (await import(
    /* @vite-ignore */ message.moduleUrl
  )) as { default?: Factory<TimeFinderModule> };
  const stationaryNamespace = (await import(
    /* @vite-ignore */ message.stationaryModuleUrl
  )) as { default?: Factory<StationaryModule> };
  if (
    typeof timeNamespace.default !== "function" ||
    typeof stationaryNamespace.default !== "function"
  )
    throw new TypeError(
      "Gen 7 Time Finder Wasm module has no default factory.",
    );
  const locate = (file: string, source: string) => new URL(file, source).href;
  timeFinder = await timeNamespace.default({
    locateFile: (file) => locate(file, message.moduleUrl),
  });
  stationary = await stationaryNamespace.default({
    locateFile: (file) => locate(file, message.stationaryModuleUrl),
  });
  if (
    timeFinder._gen7timefinder_api_version() !== GEN7_TIMEFINDER_API_VERSION ||
    stationary._gen7stationary_api_version() !== GEN7_STATIONARY_API_VERSION
  )
    throw new Error("Gen 7 Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen7timefinder",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_TIMEFINDER_API_VERSION,
    operations: ["time-search"],
  });
}

function packTimeResults(
  base: Uint32Array,
  count: number,
  initialSeed: number,
  epoch: bigint,
) {
  const packed = new Uint32Array(count * GEN7_STATIONARY_TIME_RESULT_WORDS);
  for (let index = 0; index < count; index++) {
    const source = index * GEN7_STATIONARY_RESULT_WORDS;
    const target = index * GEN7_STATIONARY_TIME_RESULT_WORDS;
    packed.set(
      base.subarray(source, source + GEN7_STATIONARY_RESULT_WORDS),
      target,
    );
    packed[target + 9] = initialSeed >>> 0;
    packed[target + 10] = Number(epoch & 0xffff_ffffn);
    packed[target + 11] = Number((epoch >> 32n) & 0xffff_ffffn);
  }
  return packed;
}

async function run(message: Gen7StationaryTimeWorkerTask) {
  if (!timeFinder || !stationary)
    throw new Error("Gen 7 Time Finder Wasm is unavailable.");
  if (activeTaskId)
    throw new Error("A Gen 7 Time Finder task is already running.");
  if (
    message.moduleId !== "gen7timefinder" ||
    message.apiVersion !== GEN7_TIMEFINDER_API_VERSION ||
    message.taskId.length === 0 ||
    message.operation !== "time-search" ||
    !Number.isInteger(message.stepSize) ||
    message.stepSize < 1 ||
    message.stepSize > 65_536
  )
    throw new TypeError("Invalid Gen 7 Time Finder Worker task.");
  const request = validateGen7StationaryTimeRequest(message.request);
  gen7StationaryTimeTaskCount(request);
  const stationaryRequest = encodeGen7StationaryRequest({
    ...request,
    seed: 0,
  });
  if (stationaryRequest.length !== GEN7_STATIONARY_REQUEST_WORDS)
    throw new Error("Gen 7 Stationary request packing changed unexpectedly.");
  const pointer = stationary._malloc(stationaryRequest.byteLength);
  if (pointer === 0)
    throw new Error("Gen 7 Stationary Wasm allocation failed.");
  if (
    (pointer & 3) !== 0 ||
    pointer + stationaryRequest.byteLength > stationary.HEAPU32.byteLength
  ) {
    stationary._free(pointer);
    throw new RangeError("Gen 7 Stationary Wasm request pointer is invalid.");
  }
  activeTaskId = message.taskId;
  let batchIndex = 0;
  let totalProcessed = 0;
  let totalResults = 0;
  let limitReached = false;
  try {
    for (
      let epoch = request.startEpoch;
      epoch <= request.endEpoch && activeTaskId === message.taskId;
      epoch += 1000n
    ) {
      const initialSeed =
        timeFinder._gen7timefinder_initial_seed(
          request.tick,
          Number(epoch & 0xffff_ffffn),
          Number((epoch >> 32n) & 0xffff_ffffn),
        ) >>> 0;
      const seeded = new Uint32Array(stationaryRequest);
      seeded[0] = initialSeed;
      seeded[GEN7_STATIONARY_REQUEST_WORDS - 1] =
        request.resultLimit - totalResults;
      stationary.HEAPU32.set(seeded, pointer >>> 2);
      if (stationary._gen7stationary_begin(pointer) !== 1)
        throw new Error(
          `Gen 7 Stationary Wasm begin returned error ${stationary._gen7stationary_last_error()}.`,
        );
      while (
        stationary._gen7stationary_done() !== 1 &&
        activeTaskId === message.taskId
      ) {
        const count = stationary._gen7stationary_step(message.stepSize);
        const error = stationary._gen7stationary_last_error();
        if (error !== 0)
          throw new Error(`Gen 7 Stationary Wasm returned error ${error}.`);
        const base = copyStationaryResults(count);
        const packed = packTimeResults(base, count, initialSeed, epoch);
        totalProcessed += stationary._gen7stationary_step_processed();
        totalResults += count;
        const stationaryLimitReached =
          stationary._gen7stationary_limit_reached() === 1;
        // A time search has another limit boundary when a completed epoch
        // still leaves later timestamps to inspect.
        limitReached ||= gen7StationaryTimeResultLimitReached(
          request,
          epoch,
          totalResults,
          stationaryLimitReached,
        );
        const done =
          totalResults >= request.resultLimit ||
          (epoch >= request.endEpoch &&
            stationary._gen7stationary_done() === 1);
        post(
          {
            type: "batch",
            moduleId: "gen7timefinder",
            apiVersion: GEN7_TIMEFINDER_API_VERSION,
            taskId: message.taskId,
            operation: "time-search",
            batchIndex: batchIndex++,
            buffer: packed.buffer,
            processedCount: stationary._gen7stationary_step_processed(),
            totalProcessed,
            resultCount: count,
            totalResultCount: totalResults,
            done,
            limitReached,
          },
          [packed.buffer],
        );
        if (done) break;
        await nextTask();
      }
      if (totalResults >= request.resultLimit) break;
    }
  } finally {
    stationary._free(pointer);
    activeTaskId = undefined;
  }
}

async function handle(message: Gen7StationaryTimeWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7timefinder",
      apiVersion: GEN7_TIMEFINDER_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7StationaryTimeWorkerRequest>) => {
  void handle(data);
};
