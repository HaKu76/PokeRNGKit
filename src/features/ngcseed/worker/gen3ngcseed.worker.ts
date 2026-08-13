/// <reference lib="webworker" />
import {
  GEN3_NGC_SEED_API_VERSION,
  GEN3_NGC_SEED_RESULT_WORDS,
  validateGen3NgcSeedRequest,
} from "../domain";
import type {
  Gen3NgcSeedWorkerRequest,
  Gen3NgcSeedWorkerResponse,
} from "./messages";
interface Module {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen3ngcseed_api_version(): number;
  _gen3ngcseed_search_gales(
    player: number,
    enemy: number,
    e0: number,
    e1: number,
    p0: number,
    p1: number,
    seeds: number,
    count: number,
    lowStart: number,
    lowCount: number,
  ): number;
  _gen3ngcseed_search_colo(
    lead: number,
    trainer: number,
    seeds: number,
    count: number,
    lowStart: number,
    lowCount: number,
  ): number;
  _gen3ngcseed_search_channel(
    patterns: number,
    count: number,
    startSeed: number,
    stateCount: number,
  ): number;
  _gen3ngcseed_result_ptr(): number;
  _gen3ngcseed_result_count(): number;
  _gen3ngcseed_last_error(): number;
}
type Factory = (options: {
  locateFile(path: string): string;
}) => Promise<Module>;
const scope = self as DedicatedWorkerGlobalScope;
let wasm: Module | undefined;
function post(
  message: Gen3NgcSeedWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function initialize(moduleUrl: string) {
  const namespace = (await import(/* @vite-ignore */ moduleUrl)) as {
    default?: Factory;
  };
  if (typeof namespace.default !== "function")
    throw new TypeError(
      "NGC Seed Wasm module does not export a default factory.",
    );
  wasm = await namespace.default({
    locateFile: (file) => new URL(file, moduleUrl).href,
  });
  const apiVersion = wasm._gen3ngcseed_api_version();
  if (apiVersion !== GEN3_NGC_SEED_API_VERSION)
    throw new Error("NGC Seed Wasm API version mismatch.");
  post({ type: "ready", apiVersion });
}
function run(message: Extract<Gen3NgcSeedWorkerRequest, { type: "run" }>) {
  if (!wasm) throw new Error("NGC Seed Wasm module is not initialized.");
  if (
    !message.taskId ||
    !Number.isInteger(message.chunkIndex) ||
    message.chunkIndex < 0 ||
    !Number.isInteger(message.rangeStart) ||
    message.rangeStart < 0 ||
    message.rangeStart > 0xffff_ffff ||
    !Number.isInteger(message.stateCount) ||
    message.stateCount < 1 ||
    message.stateCount > 0xffff_ffff ||
    validateGen3NgcSeedRequest(message.request).length > 0
  )
    throw new RangeError("NGC Seed Worker received an invalid task.");
  const startedAt = performance.now();
  const request = message.request;
  const seeds =
    request.seeds instanceof Uint32Array
      ? request.seeds
      : new Uint32Array(request.seeds ?? []);
  if (seeds.length > 0 && seeds.length !== message.stateCount)
    throw new RangeError("NGC Seed Worker received an invalid Seed chunk.");
  const seedPointer = seeds.length ? wasm._malloc(seeds.byteLength) : 0;
  const patterns = new Uint32Array(request.patterns ?? []);
  const patternPointer = patterns.length
    ? wasm._malloc(patterns.byteLength)
    : 0;
  try {
    if (seedPointer) wasm.HEAPU32.set(seeds, seedPointer >>> 2);
    if (patternPointer) wasm.HEAPU32.set(patterns, patternPointer >>> 2);
    let count = 0;
    if (request.mode === "gales")
      count = wasm._gen3ngcseed_search_gales(
        request.playerIndex!,
        request.enemyIndex!,
        request.enemyHp![0],
        request.enemyHp![1],
        request.playerHp![0],
        request.playerHp![1],
        seedPointer,
        seeds.length,
        message.rangeStart,
        message.stateCount,
      );
    else if (request.mode === "colo")
      count = wasm._gen3ngcseed_search_colo(
        request.partyLead!,
        request.trainer!,
        seedPointer,
        seeds.length,
        message.rangeStart,
        message.stateCount,
      );
    else
      count = wasm._gen3ngcseed_search_channel(
        patternPointer,
        patterns.length,
        message.rangeStart,
        message.stateCount,
      );
    if (wasm._gen3ngcseed_last_error() !== 0)
      throw new Error("NGC Seed Wasm core rejected the request.");
    if (count !== wasm._gen3ngcseed_result_count())
      throw new Error("NGC Seed result count changed before copying.");
    const pointer = wasm._gen3ngcseed_result_ptr();
    const wordCount = count * GEN3_NGC_SEED_RESULT_WORDS;
    if (pointer % 4 !== 0 || pointer / 4 + wordCount > wasm.HEAPU32.length)
      throw new RangeError("NGC Seed core returned an invalid result range.");
    const words = wasm.HEAPU32.slice(pointer / 4, pointer / 4 + wordCount);
    post(
      {
        type: "batch",
        taskId: message.taskId,
        chunkIndex: message.chunkIndex,
        resultCount: count,
        processed: message.stateCount,
        total: message.stateCount,
        elapsedMs: performance.now() - startedAt,
        buffer: words.buffer,
      },
      [words.buffer],
    );
  } finally {
    if (seedPointer) wasm._free(seedPointer);
    if (patternPointer) wasm._free(patternPointer);
  }
}
scope.onmessage = async ({ data }: MessageEvent<Gen3NgcSeedWorkerRequest>) => {
  try {
    if (data.type === "init") await initialize(data.moduleUrl);
    else run(data);
  } catch (error) {
    post({
      type: "error",
      taskId: data.type === "run" ? data.taskId : undefined,
      code: "calculation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
