/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../shared/rngModuleContract";
import {
  encodeThreeDsProfileCalibratorResults,
  THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
  validateThreeDsProfileCalibratorRequest,
} from "./calibratorDomain";
import type {
  ThreeDsProfileCalibratorRequestMessage,
  ThreeDsProfileCalibratorResponse,
  ThreeDsProfileCalibratorTask,
} from "./calibratorMessages";

interface TimeFinderModule {
  _gen7timefinder_api_version(): number;
  _gen7timefinder_initial_seed(
    tick: number,
    epochLow: number,
    epochHigh: number,
  ): number;
}

type Factory<T> = (options: { locateFile(file: string): string }) => Promise<T>;
const scope = self as DedicatedWorkerGlobalScope;
let timeFinder: TimeFinderModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: ThreeDsProfileCalibratorResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function initialize(
  message: Extract<ThreeDsProfileCalibratorRequestMessage, { type: "init" }>,
) {
  if (
    message.moduleId !== "3ds-profile-calibrator" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== THREE_DS_PROFILE_CALIBRATOR_API_VERSION
  )
    throw new Error("Profile Calibrator Worker contract mismatch.");
  const namespace = (await import(/* @vite-ignore */ message.moduleUrl)) as {
    default?: Factory<TimeFinderModule>;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError("Gen 7 Time Finder Wasm factory is unavailable.");
  timeFinder = await namespace.default({
    locateFile: (file) => new URL(file, message.moduleUrl).href,
  });
  if (timeFinder._gen7timefinder_api_version() !== 1)
    throw new Error("Gen 7 Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "3ds-profile-calibrator",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
    operations: ["profile-calibration"],
  });
}

async function run(message: ThreeDsProfileCalibratorTask) {
  if (!timeFinder) throw new Error("Gen 7 Time Finder Wasm is unavailable.");
  if (
    message.moduleId !== "3ds-profile-calibrator" ||
    message.apiVersion !== THREE_DS_PROFILE_CALIBRATOR_API_VERSION ||
    message.operation !== "profile-calibration" ||
    !message.taskId
  )
    throw new TypeError("Invalid Profile Calibrator task.");
  if (activeTaskId)
    throw new Error("A Profile Calibrator search is already running.");
  const request = validateThreeDsProfileCalibratorRequest(message.request);
  activeTaskId = message.taskId;
  let batchIndex = 0;
  let totalProcessed = 0;
  let totalResults = 0;
  let limitReached = false;
  const emit = (
    results: { tick: number; offset: number }[],
    processedCount: number,
    done: boolean,
  ) => {
    const packed = encodeThreeDsProfileCalibratorResults(results);
    post(
      {
        type: "batch",
        moduleId: "3ds-profile-calibrator",
        apiVersion: THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
        taskId: message.taskId,
        operation: "profile-calibration",
        batchIndex: batchIndex++,
        buffer: packed.buffer,
        processedCount,
        totalProcessed,
        resultCount: results.length,
        totalResultCount: totalResults,
        done,
        limitReached,
      },
      [packed.buffer],
    );
  };
  try {
    let batch: { tick: number; offset: number }[] = [];
    let processedSinceBatch = 0;
    for (
      let tickDelta = 0;
      tickDelta <= request.tickRange && activeTaskId === message.taskId;
      tickDelta++
    ) {
      for (
        let offsetDelta = 0;
        offsetDelta <= request.offsetRange && activeTaskId === message.taskId;
        offsetDelta++
      ) {
        const plusEpoch =
          request.dateEpoch + BigInt(request.baseOffset + offsetDelta);
        const plusSeed =
          timeFinder._gen7timefinder_initial_seed(
            (request.baseTick + tickDelta) >>> 0,
            Number(plusEpoch & 0xffff_ffffn),
            Number((plusEpoch >> 32n) & 0xffff_ffffn),
          ) >>> 0;
        if (plusSeed === request.initialSeed) {
          if (totalResults >= request.resultLimit) {
            limitReached = true;
            break;
          }
          batch.push({
            tick: (request.baseTick + tickDelta) >>> 0,
            offset: (request.baseOffset + offsetDelta) >>> 0,
          });
          totalResults++;
        }
        const minusEpoch =
          request.dateEpoch + BigInt(request.baseOffset) - BigInt(offsetDelta);
        const minusSeed =
          timeFinder._gen7timefinder_initial_seed(
            (request.baseTick - tickDelta) >>> 0,
            Number(minusEpoch & 0xffff_ffffn),
            Number((minusEpoch >> 32n) & 0xffff_ffffn),
          ) >>> 0;
        if (minusSeed === request.initialSeed) {
          if (totalResults >= request.resultLimit) {
            limitReached = true;
            break;
          }
          batch.push({
            tick: (request.baseTick - tickDelta) >>> 0,
            offset: (request.baseOffset - offsetDelta) >>> 0,
          });
          totalResults++;
        }
        totalProcessed++;
        processedSinceBatch++;
        if (processedSinceBatch >= message.stepSize) {
          emit(batch, processedSinceBatch, false);
          batch = [];
          processedSinceBatch = 0;
          await nextTask();
        }
      }
      if (limitReached) break;
    }
    if (batch.length || processedSinceBatch !== 0) {
      emit(
        batch,
        processedSinceBatch,
        limitReached ||
          totalProcessed >= (request.tickRange + 1) * (request.offsetRange + 1),
      );
    } else {
      emit([], 0, true);
    }
  } finally {
    activeTaskId = undefined;
  }
}

async function handle(message: ThreeDsProfileCalibratorRequestMessage) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    post({
      type: "error",
      moduleId: "3ds-profile-calibrator",
      apiVersion: THREE_DS_PROFILE_CALIBRATOR_API_VERSION,
      taskId: message.type === "task" ? message.taskId : undefined,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({
  data,
}: MessageEvent<ThreeDsProfileCalibratorRequestMessage>) => {
  void handle(data);
};
