/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen7EventTimeRequest,
  GEN7_EVENT_TIME_API_VERSION,
  GEN7_EVENT_TIME_RESULT_WORDS,
  validateGen7EventTimeRequest,
} from "../timeDomain";
import type {
  Gen7EventTimeWorkerRequest,
  Gen7EventTimeWorkerResponse,
  Gen7EventTimeWorkerTask,
} from "./timeMessages";

interface InitialSeedModule {
  _gen7timefinder_api_version(): number;
  _gen7timefinder_initial_seed(
    tick: number,
    epochLow: number,
    epochHigh: number,
  ): number;
}

interface EventModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen7eventtimefinder_api_version(): number;
  _gen7eventtimefinder_begin(pointer: number): number;
  _gen7eventtimefinder_step(maximumStates: number): number;
  _gen7eventtimefinder_result_ptr(): number;
  _gen7eventtimefinder_result_count(): number;
  _gen7eventtimefinder_step_processed(): number;
  _gen7eventtimefinder_total_processed(): number;
  _gen7eventtimefinder_total_results(): number;
  _gen7eventtimefinder_done(): number;
  _gen7eventtimefinder_limit_reached(): number;
  _gen7eventtimefinder_last_error(): number;
}

type InitialSeedFactory = (options: {
  locateFile(file: string): string;
}) => Promise<InitialSeedModule>;
type EventFactory = (options: {
  locateFile(file: string): string;
}) => Promise<EventModule>;

const scope = self as DedicatedWorkerGlobalScope;
let initialSeedWasm: InitialSeedModule | undefined;
let eventWasm: EventModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: Gen7EventTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function copyEventResults(resultCount: number) {
  if (
    !eventWasm ||
    resultCount !== eventWasm._gen7eventtimefinder_result_count()
  )
    throw new Error(
      "Gen 7 Event Time Finder returned an invalid result count.",
    );
  const pointer = eventWasm._gen7eventtimefinder_result_ptr();
  const words = resultCount * 5;
  const bytes = words * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (resultCount !== 0 && pointer === 0) ||
    (pointer & 3) !== 0 ||
    pointer < 0 ||
    pointer + bytes > eventWasm.HEAPU32.byteLength
  )
    throw new RangeError("Gen 7 Event Time Finder result pointer is invalid.");
  return eventWasm.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + words);
}

function appendTime(words: Uint32Array, seed: number, epoch: bigint) {
  const output = new Uint32Array(
    (words.length / 5) * GEN7_EVENT_TIME_RESULT_WORDS,
  );
  for (
    let source = 0, target = 0;
    source < words.length;
    source += 5, target += 8
  ) {
    output.set(words.subarray(source, source + 5), target);
    output[target + 5] = seed >>> 0;
    output[target + 6] = Number(epoch & 0xffff_ffffn);
    output[target + 7] = Number(epoch >> 32n);
  }
  return output;
}

async function initialize(
  message: Extract<Gen7EventTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7eventtimefinder" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_EVENT_TIME_API_VERSION
  )
    throw new Error("Gen 7 Event Time Finder Worker contract mismatch.");
  const initialNamespace = (await import(
    /* @vite-ignore */ message.moduleUrl
  )) as {
    default?: InitialSeedFactory;
  };
  const eventNamespace = (await import(
    /* @vite-ignore */ message.eventModuleUrl
  )) as {
    default?: EventFactory;
  };
  if (
    typeof initialNamespace.default !== "function" ||
    typeof eventNamespace.default !== "function"
  )
    throw new TypeError("Gen 7 Event Time Finder Wasm factory is unavailable.");
  initialSeedWasm = await initialNamespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  eventWasm = await eventNamespace.default({
    locateFile: (file) => new URL(file, message.eventModuleUrl).href,
  });
  if (initialSeedWasm._gen7timefinder_api_version() !== 1)
    throw new Error("Gen 7 Time Finder Wasm API mismatch.");
  if (
    eventWasm._gen7eventtimefinder_api_version() !== GEN7_EVENT_TIME_API_VERSION
  )
    throw new Error("Gen 7 Event Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen7eventtimefinder",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_EVENT_TIME_API_VERSION,
    operations: ["event-time-search"],
  });
}

async function run(message: Gen7EventTimeWorkerTask) {
  if (!initialSeedWasm || !eventWasm)
    throw new Error("Gen 7 Event Time Finder Wasm is unavailable.");
  if (activeTaskId)
    throw new Error("A Gen 7 Event Time Finder task is already running.");
  if (
    message.moduleId !== "gen7eventtimefinder" ||
    message.apiVersion !== GEN7_EVENT_TIME_API_VERSION ||
    message.operation !== "event-time-search" ||
    !Number.isInteger(message.stepSize) ||
    message.stepSize < 1 ||
    message.stepSize > 65_536
  )
    throw new TypeError("Invalid Gen 7 Event Time Finder task.");
  validateGen7EventTimeRequest(message.request);
  activeTaskId = message.taskId;
  let epoch = message.request.startEpoch;
  let totalProcessed = 0;
  let totalResults = 0;
  let batchIndex = 0;
  let limitReached = false;
  try {
    while (
      activeTaskId === message.taskId &&
      epoch <= message.request.endEpoch
    ) {
      if (totalResults >= message.request.resultLimit) {
        limitReached = epoch < message.request.endEpoch;
        break;
      }
      const epochLow = Number(epoch & 0xffff_ffffn);
      const epochHigh = Number(epoch >> 32n);
      const seed = initialSeedWasm._gen7timefinder_initial_seed(
        message.request.tick,
        epochLow,
        epochHigh,
      );
      const remaining = message.request.resultLimit - totalResults;
      const words = encodeGen7EventTimeRequest(message.request, seed);
      const pointer = eventWasm._malloc(words.byteLength);
      if (!pointer)
        throw new Error("Gen 7 Event Time Finder Wasm allocation failed.");
      try {
        if (
          (pointer & 3) !== 0 ||
          pointer + words.byteLength > eventWasm.HEAPU32.byteLength
        )
          throw new RangeError(
            "Gen 7 Event Time Finder request pointer is invalid.",
          );
        const requestWords = new Uint32Array(words);
        requestWords[44] = remaining;
        eventWasm.HEAPU32.set(requestWords, pointer >>> 2);
        if (eventWasm._gen7eventtimefinder_begin(pointer) !== 1)
          throw new Error(
            `Gen 7 Event Time Finder begin returned error ${eventWasm._gen7eventtimefinder_last_error()}.`,
          );
      } finally {
        eventWasm._free(pointer);
      }
      while (
        activeTaskId === message.taskId &&
        eventWasm._gen7eventtimefinder_done() === 0
      ) {
        const resultCount = eventWasm._gen7eventtimefinder_step(
          message.stepSize,
        );
        const error = eventWasm._gen7eventtimefinder_last_error();
        if (error !== 0)
          throw new Error(`Gen 7 Event Time Finder returned error ${error}.`);
        const copied = copyEventResults(resultCount);
        const processedCount = eventWasm._gen7eventtimefinder_step_processed();
        totalProcessed += processedCount;
        totalResults += resultCount;
        const combined = appendTime(copied, seed, epoch);
        const sessionLimit =
          eventWasm._gen7eventtimefinder_limit_reached() === 1;
        limitReached =
          sessionLimit ||
          (totalResults >= message.request.resultLimit &&
            epoch < message.request.endEpoch);
        const done =
          eventWasm._gen7eventtimefinder_done() === 1 &&
          (epoch >= message.request.endEpoch ||
            totalResults >= message.request.resultLimit);
        post(
          {
            type: "batch",
            moduleId: "gen7eventtimefinder",
            apiVersion: GEN7_EVENT_TIME_API_VERSION,
            taskId: message.taskId,
            operation: "event-time-search",
            batchIndex: batchIndex++,
            buffer: combined.buffer,
            processedCount,
            totalProcessed,
            resultCount,
            totalResultCount: totalResults,
            done,
            limitReached,
          },
          [combined.buffer],
        );
        if (done) {
          activeTaskId = undefined;
          return;
        }
        await nextTask();
      }
      epoch += 1000n;
    }
    post({
      type: "batch",
      moduleId: "gen7eventtimefinder",
      apiVersion: GEN7_EVENT_TIME_API_VERSION,
      taskId: message.taskId,
      operation: "event-time-search",
      batchIndex: batchIndex++,
      buffer: new ArrayBuffer(0),
      processedCount: 0,
      totalProcessed,
      resultCount: 0,
      totalResultCount: totalResults,
      done: true,
      limitReached,
    });
    activeTaskId = undefined;
  } finally {
    if (activeTaskId === message.taskId) activeTaskId = undefined;
  }
}

async function handle(message: Gen7EventTimeWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7eventtimefinder",
      apiVersion: GEN7_EVENT_TIME_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7EventTimeWorkerRequest>) => {
  void handle(data);
};
