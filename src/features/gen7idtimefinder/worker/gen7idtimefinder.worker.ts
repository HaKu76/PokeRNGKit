/// <reference lib="webworker" />

import { RNG_MODULE_CONTRACT_VERSION } from "../../shared/rngModuleContract";
import {
  createGen7IdChunks,
  decodeGen7IdStates,
  filterGen7IdPackedStates,
  GEN7_ID_API_VERSION,
} from "../../gen7id/domain";
import {
  encodeGen7IdTimeResults,
  GEN7_ID_TIME_API_VERSION,
  validateGen7IdTimeRequest,
  type Gen7IdTimeResult,
} from "../timeDomain";
import type {
  Gen7IdTimeWorkerRequest,
  Gen7IdTimeWorkerResponse,
} from "./timeMessages";

interface InitialSeedModule {
  _gen7timefinder_api_version(): number;
  _gen7timefinder_initial_seed(
    tick: number,
    epochLow: number,
    epochHigh: number,
  ): number;
}

interface IdModule {
  HEAPU32: Uint32Array;
  _gen7id_api_version(): number;
  _gen7id_generate(
    seed: number,
    minAdvances: number,
    maxAdvances: number,
    correction: number,
    filterMode: number,
    filterValue: number,
    filterDigits: number,
    tsv: number,
    randLow: number,
    randHigh: number,
    randDigits: number,
  ): number;
  _gen7id_result_ptr(): number;
  _gen7id_result_count(): number;
  _gen7id_last_error(): number;
}

type Factory<T> = (options: { locateFile(file: string): string }) => Promise<T>;

const scope = self as DedicatedWorkerGlobalScope;
let initialSeedWasm: InitialSeedModule | undefined;
let idWasm: IdModule | undefined;
let activeTaskId: string | undefined;

function post(
  message: Gen7IdTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

function copyIdResults(count: number) {
  if (!idWasm || count !== idWasm._gen7id_result_count())
    throw new Error("Gen 7 ID Wasm returned an invalid result count.");
  const pointer = idWasm._gen7id_result_ptr();
  const words = count * 8;
  const bytes = words * Uint32Array.BYTES_PER_ELEMENT;
  if (
    (count !== 0 && pointer === 0) ||
    (pointer & 3) !== 0 ||
    pointer < 0 ||
    pointer + bytes > idWasm.HEAPU32.byteLength
  )
    throw new RangeError("Gen 7 ID Wasm result pointer is invalid.");
  return idWasm.HEAPU32.slice(pointer >>> 2, (pointer >>> 2) + words);
}

function appendTime(
  states: readonly Gen7IdTimeResult[],
  initialSeed: number,
  epoch: bigint,
) {
  return encodeGen7IdTimeResults(
    states.map((state) => ({ ...state, initialSeed, epoch })),
  );
}

async function initialize(
  message: Extract<Gen7IdTimeWorkerRequest, { type: "init" }>,
) {
  if (
    message.moduleId !== "gen7idtimefinder" ||
    message.contractVersion !== RNG_MODULE_CONTRACT_VERSION ||
    message.apiVersion !== GEN7_ID_TIME_API_VERSION
  )
    throw new Error("Gen 7 ID Time Finder Worker contract mismatch.");
  const initialNamespace = (await import(
    /* @vite-ignore */ message.initialSeedModuleUrl
  )) as { default?: Factory<InitialSeedModule> };
  const idNamespace = (await import(
    /* @vite-ignore */ message.idModuleUrl
  )) as { default?: Factory<IdModule> };
  if (
    typeof initialNamespace.default !== "function" ||
    typeof idNamespace.default !== "function"
  )
    throw new TypeError("Gen 7 ID Time Finder Wasm factory is unavailable.");
  initialSeedWasm = await initialNamespace.default({
    locateFile: (file) => new URL(file, message.initialSeedModuleUrl).href,
  });
  idWasm = await idNamespace.default({
    locateFile: (file) => new URL(file, message.idModuleUrl).href,
  });
  if (
    initialSeedWasm._gen7timefinder_api_version() !== 1 ||
    idWasm._gen7id_api_version() !== GEN7_ID_API_VERSION
  )
    throw new Error("Gen 7 ID Time Finder Wasm API mismatch.");
  post({
    type: "ready",
    moduleId: "gen7idtimefinder",
    contractVersion: RNG_MODULE_CONTRACT_VERSION,
    apiVersion: GEN7_ID_TIME_API_VERSION,
    operations: ["id-time-search"],
  });
}

async function run(
  message: Extract<Gen7IdTimeWorkerRequest, { type: "task" }>,
) {
  if (!initialSeedWasm || !idWasm)
    throw new Error("Gen 7 ID Time Finder Wasm is unavailable.");
  if (
    message.moduleId !== "gen7idtimefinder" ||
    message.apiVersion !== GEN7_ID_TIME_API_VERSION ||
    message.operation !== "id-time-search" ||
    message.taskId.length === 0
  )
    throw new TypeError("Invalid Gen 7 ID Time Finder task.");
  const request = validateGen7IdTimeRequest(message.request);
  if (activeTaskId) throw new Error("A Gen 7 ID Time Finder task is running.");
  activeTaskId = message.taskId;
  let totalProcessed = 0;
  let totalResults = 0;
  let batchIndex = 0;
  let limitReached = false;
  try {
    for (
      let epoch = request.startEpoch;
      epoch <= request.endEpoch && activeTaskId === message.taskId;
      epoch += 1000n
    ) {
      if (totalResults >= request.resultLimit) {
        limitReached = epoch < request.endEpoch;
        break;
      }
      const initialSeed = initialSeedWasm._gen7timefinder_initial_seed(
        request.tick,
        Number(epoch & 0xffff_ffffn),
        Number((epoch >> 32n) & 0xffff_ffffn),
      );
      const idRequest = {
        version: request.version,
        seed: initialSeed >>> 0,
        minAdvances: request.minFrame,
        maxAdvances: request.maxFrame,
        correction: request.correction,
        filters: request.filters,
      };
      const chunks = createGen7IdChunks(idRequest);
      for (const chunk of chunks) {
        if (activeTaskId !== message.taskId) break;
        if (totalResults >= request.resultLimit) {
          limitReached = true;
          break;
        }
        const generated = idWasm._gen7id_generate(
          initialSeed,
          chunk.minAdvances,
          chunk.maxAdvances,
          request.correction,
          0,
          0,
          0,
          0xffff_ffff,
          0xffff_ffff,
          0xffff_ffff,
          0,
        );
        if (idWasm._gen7id_last_error() !== 0 || generated !== chunk.stateCount)
          throw new Error("Gen 7 ID Time Finder ID Wasm returned an error.");
        const raw = copyIdResults(generated);
        const filtered = filterGen7IdPackedStates(raw, request.filters);
        const states = decodeGen7IdStates(new Uint32Array(filtered).buffer);
        const remaining = request.resultLimit - totalResults;
        const accepted = states.slice(0, remaining);
        totalProcessed += chunk.stateCount;
        totalResults += accepted.length;
        if (
          accepted.length < states.length ||
          totalResults >= request.resultLimit
        )
          limitReached = true;
        const combined = appendTime(
          accepted.map((state) => ({ ...state, initialSeed, epoch })),
          initialSeed,
          epoch,
        );
        const done =
          limitReached ||
          (epoch >= request.endEpoch && chunk.index === chunks.length - 1);
        post(
          {
            type: "batch",
            moduleId: "gen7idtimefinder",
            apiVersion: GEN7_ID_TIME_API_VERSION,
            taskId: message.taskId,
            operation: "id-time-search",
            batchIndex: batchIndex++,
            buffer: combined.buffer,
            processedCount: chunk.stateCount,
            totalProcessed,
            resultCount: accepted.length,
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
      if (limitReached) break;
    }
    post({
      type: "batch",
      moduleId: "gen7idtimefinder",
      apiVersion: GEN7_ID_TIME_API_VERSION,
      taskId: message.taskId,
      operation: "id-time-search",
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

async function handle(message: Gen7IdTimeWorkerRequest) {
  try {
    if (message.type === "init") await initialize(message);
    else await run(message);
  } catch (error) {
    const taskId = message.type === "task" ? message.taskId : undefined;
    if (activeTaskId === taskId) activeTaskId = undefined;
    post({
      type: "error",
      moduleId: "gen7idtimefinder",
      apiVersion: GEN7_ID_TIME_API_VERSION,
      taskId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = ({ data }: MessageEvent<Gen7IdTimeWorkerRequest>) => {
  void handle(data);
};
