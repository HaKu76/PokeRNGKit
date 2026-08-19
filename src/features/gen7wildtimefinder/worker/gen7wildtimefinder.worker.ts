import { encodeRequest, type Gen7WildTimeRequest } from "../timeDomain";
import type {
  Gen7WildTimeWorkerRequest,
  Gen7WildTimeWorkerResponse,
} from "./timeMessages";
const scope = self as unknown as DedicatedWorkerGlobalScope;
interface WildWasm {
  HEAPU32: Uint32Array;
  _malloc(size: number): number;
  _free(pointer: number): void;
  _gen7wildtimefinder_begin(pointer: number): number;
  _gen7wildtimefinder_done(): number;
  _gen7wildtimefinder_step(size: number): number;
  _gen7wildtimefinder_result_ptr(): number;
  _gen7wildtimefinder_step_processed(): number;
  _gen7wildtimefinder_limit_reached(): number;
}
interface SeedWasm {
  _gen7timefinder_initial_seed(tick: number, low: number, high: number): number;
}
let wild: WildWasm | undefined;
let seedFinder: SeedWasm | undefined;
let activeTask: string | undefined;
function post(
  message: Gen7WildTimeWorkerResponse,
  transfer: Transferable[] = [],
) {
  scope.postMessage(message, transfer);
}
async function run(taskId: string, request: Gen7WildTimeRequest) {
  if (!wild || !seedFinder)
    throw new Error("Gen VII Wild Time Finder Wasm is unavailable.");
  activeTask = taskId;
  let epoch = request.startEpoch;
  let processed = 0;
  let resultCount = 0;
  while (
    activeTask === taskId &&
    epoch <= request.endEpoch &&
    resultCount < request.resultLimit
  ) {
    const seed = seedFinder._gen7timefinder_initial_seed(
      request.tick,
      Number(epoch & 0xffff_ffffn),
      Number(epoch >> 32n),
    );
    const encoded = encodeRequest(request, seed);
    const pointer = wild._malloc(encoded.byteLength);
    if (!pointer) throw new Error("Wasm allocation failed.");
    try {
      wild.HEAPU32.set(encoded, pointer >>> 2);
      if (wild._gen7wildtimefinder_begin(pointer) !== 1)
        throw new Error("Wild Time Finder rejected the request.");
    } finally {
      wild._free(pointer);
    }
    while (activeTask === taskId && wild._gen7wildtimefinder_done() === 0) {
      const count = wild._gen7wildtimefinder_step(2048);
      const raw = wild.HEAPU32.slice(
        wild._gen7wildtimefinder_result_ptr() >>> 2,
        (wild._gen7wildtimefinder_result_ptr() >>> 2) + count * 6,
      );
      const combined = new Uint32Array(count * 9);
      for (
        let source = 0, target = 0;
        source < raw.length;
        source += 6, target += 9
      ) {
        combined.set(raw.subarray(source, source + 6), target);
        combined[target + 6] = seed;
        combined[target + 7] = Number(epoch & 0xffff_ffffn);
        combined[target + 8] = Number(epoch >> 32n);
      }
      const stepProcessed = wild._gen7wildtimefinder_step_processed();
      processed += stepProcessed;
      resultCount += count;
      post(
        {
          type: "batch",
          taskId,
          buffer: combined.buffer,
          processed: stepProcessed,
          total: processed,
          results: resultCount,
          done:
            wild._gen7wildtimefinder_done() === 1 && epoch >= request.endEpoch,
          limited: wild._gen7wildtimefinder_limit_reached() === 1,
        },
        [combined.buffer],
      );
      if (wild._gen7wildtimefinder_done() === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    epoch += 1000n;
  }
  post({
    type: "batch",
    taskId,
    buffer: new ArrayBuffer(0),
    processed: 0,
    total: processed,
    results: resultCount,
    done: true,
    limited: resultCount >= request.resultLimit && epoch <= request.endEpoch,
  });
  activeTask = undefined;
}
scope.onmessage = ({ data }: MessageEvent<Gen7WildTimeWorkerRequest>) => {
  void (async () => {
    try {
      if (data.type === "init") {
        wild = await (
          await import(/* @vite-ignore */ data.moduleUrl)
        ).default({
          locateFile: (file: string) => new URL(file, data.moduleUrl).href,
        });
        seedFinder = await (
          await import(/* @vite-ignore */ data.initialSeedUrl)
        ).default({
          locateFile: (file: string) => new URL(file, data.initialSeedUrl).href,
        });
        post({ type: "ready" });
      } else await run(data.taskId, data.request);
    } catch (error) {
      post({
        type: "error",
        taskId: data.type === "task" ? data.taskId : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};
