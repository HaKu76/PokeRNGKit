/// <reference lib="webworker" />
import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  encodeGen6EventRequest,
  GEN6_EVENT_API_VERSION,
  GEN6_EVENT_REQUEST_WORDS,
  GEN6_EVENT_RESULT_WORDS,
} from "../domain";
import {
  GEN6_EVENT_TIME_API_VERSION,
  GEN6_EVENT_TIME_RESULT_WORDS,
  gen6EventTimeTaskCount,
  validateGen6EventTimeRequest,
} from "../timeDomain";
import type {
  Gen6EventTimeWorkerRequest,
  Gen6EventTimeWorkerResponse,
  Gen6EventTimeWorkerTask,
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
interface EventModule {
  HEAPU32: Uint32Array;
  _malloc(bytes: number): number;
  _free(pointer: number): void;
  _gen6event_api_version(): number;
  _gen6event_generate(pointer: number): number;
  _gen6event_result_ptr(): number;
  _gen6event_result_count(): number;
  _gen6event_last_error(): number;
  _gen6event_limit_reached(): number;
}
type Factory<T> = (options: { locateFile(file: string): string }) => Promise<T>;
const scope = self as DedicatedWorkerGlobalScope;
let timeModule: TimeModule | undefined;
let eventModule: EventModule | undefined;
let activeTaskId: string | undefined;
function post(
  message: Gen6EventTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function initialize(
  message: Extract<Gen6EventTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN6_EVENT_TIME_API_VERSION
  )
    throw new Error("Gen VI Event Time Finder Worker contract mismatch.");
  const timeNs = (await import(/* @vite-ignore */ message.timeModuleUrl)) as {
    default?: Factory<TimeModule>;
  };
  const eventNs = (await import(/* @vite-ignore */ message.eventModuleUrl)) as {
    default?: Factory<EventModule>;
  };
  if (
    typeof timeNs.default !== "function" ||
    typeof eventNs.default !== "function"
  )
    throw new TypeError("Gen VI Event Time Finder Wasm factory is missing.");
  const locate = (file: string, source: string) => new URL(file, source).href;
  timeModule = await timeNs.default({
    locateFile: (file) => locate(file, message.timeModuleUrl),
  });
  eventModule = await eventNs.default({
    locateFile: (file) => locate(file, message.eventModuleUrl),
  });
  if (
    timeModule._gen6timefinder_api_version() !== 1 ||
    eventModule._gen6event_api_version() !== GEN6_EVENT_API_VERSION
  )
    throw new Error("Gen VI Event Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen6eventtimefinder",
    apiVersion: GEN6_EVENT_TIME_API_VERSION,
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    operations: ["event-time-search"],
  });
}
function run(message: Gen6EventTimeWorkerTask) {
  if (!timeModule || !eventModule)
    throw new Error("Gen VI Event Time Finder Wasm is unavailable.");
  if (activeTaskId)
    throw new Error("A Gen VI Event Time Finder task is already running.");
  const request = validateGen6EventTimeRequest(message.request);
  gen6EventTimeTaskCount(request);
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
      const packedRequest = encodeGen6EventRequest({
        ...request,
        seed,
        resultLimit: request.resultLimit - totalResults,
      });
      if (packedRequest.length !== GEN6_EVENT_REQUEST_WORDS)
        throw new Error("Gen VI Event request packing changed unexpectedly.");
      const pointer = eventModule._malloc(packedRequest.byteLength);
      if (!pointer) throw new Error("Gen VI Event Wasm allocation failed.");
      let count = 0;
      let copied = new Uint32Array();
      try {
        eventModule.HEAPU32.set(packedRequest, pointer >>> 2);
        count = eventModule._gen6event_generate(pointer);
        if (
          eventModule._gen6event_last_error() !== 0 ||
          count !== eventModule._gen6event_result_count()
        )
          throw new Error("Gen VI Event Wasm returned an error.");
        const resultPointer = eventModule._gen6event_result_ptr();
        copied = count
          ? eventModule.HEAPU32.slice(
              resultPointer >>> 2,
              (resultPointer >>> 2) + count * GEN6_EVENT_RESULT_WORDS,
            )
          : new Uint32Array();
        limited ||= eventModule._gen6event_limit_reached() === 1;
      } finally {
        eventModule._free(pointer);
      }
      const packed = new Uint32Array(count * GEN6_EVENT_TIME_RESULT_WORDS);
      for (let index = 0; index < count; index++) {
        const source = index * GEN6_EVENT_RESULT_WORDS;
        const target = index * GEN6_EVENT_TIME_RESULT_WORDS;
        packed.set(
          copied.subarray(source, source + GEN6_EVENT_RESULT_WORDS),
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
            moduleId: "gen6eventtimefinder",
            apiVersion: GEN6_EVENT_TIME_API_VERSION,
            taskId: message.taskId,
            operation: "event-time-search",
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
    post({
      type: "batch",
      moduleId: "gen6eventtimefinder",
      apiVersion: GEN6_EVENT_TIME_API_VERSION,
      taskId: message.taskId,
      operation: "event-time-search",
      batchIndex: batchIndex++,
      buffer: new ArrayBuffer(0),
      resultCount: 0,
      totalProcessed: processed,
      totalResultCount: totalResults,
      done: true,
      limitReached: limited,
    });
  } finally {
    activeTaskId = undefined;
  }
}
scope.onmessage = async ({
  data,
}: MessageEvent<Gen6EventTimeWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      moduleId: "gen6eventtimefinder",
      apiVersion: GEN6_EVENT_TIME_API_VERSION,
      taskId: data.type === "task" ? data.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
    activeTaskId = undefined;
  }
};
