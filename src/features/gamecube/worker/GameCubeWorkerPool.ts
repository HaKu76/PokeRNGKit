import {
  createGameCubeChunks,
  decodeGameCubeStates,
  GEN3_GAMECUBE_API_VERSION,
  GEN3_GAMECUBE_MAX_RESULTS,
  gameCubeSearcherCombinationCount,
  validateGameCubeRequest,
  type GameCubeChunk,
  type GameCubeRequest,
} from "../domain";
import type {
  GameCubeEngine,
  GameCubeOptions,
  GameCubeSummary,
} from "../search";
import type { GameCubeWorkerRequest, GameCubeWorkerResponse } from "./messages";

export function defaultGen3GameCubeModuleUrl() {
  return new URL(
    `${import.meta.env.BASE_URL}wasm/gen3gamecube.mjs`,
    globalThis.location.href,
  ).href;
}

export function recommendedGameCubeWorkerCount() {
  return Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2) - 1));
}

class GameCubeWorkerClient {
  private worker: Worker;
  private ready: Promise<void>;
  private pending = new Map<
    string,
    {
      resolve: (
        batch: Extract<GameCubeWorkerResponse, { type: "batch" }>,
      ) => void;
      reject: (error: Error) => void;
    }
  >();

  constructor(
    private readonly index: number,
    private readonly moduleUrl: string,
  ) {
    this.worker = new Worker(
      new URL("./gen3gamecube.worker.ts", import.meta.url),
      { type: "module", name: `pokerngkit-gen3gamecube-${index}` },
    );
    this.ready = new Promise((resolve, reject) => {
      this.worker.onmessage = ({
        data,
      }: MessageEvent<GameCubeWorkerResponse>) => {
        if (data.type === "ready") {
          if (data.apiVersion !== GEN3_GAMECUBE_API_VERSION)
            reject(new Error("Gen3 GameCube API version mismatch."));
          else resolve();
        } else if (data.type === "error") reject(new Error(data.message));
      };
      this.worker.onerror = (event) =>
        reject(new Error(event.message || "Gen3 GameCube Worker crashed."));
      this.worker.postMessage({
        type: "init",
        moduleUrl,
      } satisfies GameCubeWorkerRequest);
    });
  }

  async search(taskId: string, request: GameCubeRequest, chunk: GameCubeChunk) {
    await this.ready;
    return new Promise<Extract<GameCubeWorkerResponse, { type: "batch" }>>(
      (resolve, reject) => {
        this.pending.set(taskId, { resolve, reject });
        this.worker.onerror = (event) => {
          reject(new Error(event.message || "Gen3 GameCube Worker crashed."));
        };
        this.worker.onmessage = ({
          data,
        }: MessageEvent<GameCubeWorkerResponse>) => {
          if (data.type === "error")
            this.pending
              .get(data.taskId ?? "")
              ?.reject(new Error(data.message));
          else if (data.type === "batch")
            this.pending.get(data.taskId)?.resolve(data);
        };
        this.worker.postMessage({
          type: "run",
          taskId,
          request,
          chunk,
        } satisfies GameCubeWorkerRequest);
      },
    ).finally(() => this.pending.delete(taskId));
  }

  terminate() {
    for (const pending of this.pending.values())
      pending.reject(new Error("Gen3 GameCube Worker cancelled."));
    this.pending.clear();
    this.worker.terminate();
  }
}

export class Gen3GameCubeWorkerPool implements GameCubeEngine {
  private clients: GameCubeWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3GameCubeModuleUrl()) {}

  async search(
    request: GameCubeRequest,
    options: GameCubeOptions = {},
  ): Promise<GameCubeSummary> {
    if (this.running)
      throw new Error("A Gen3 GameCube calculation is already running.");
    const errors = validateGameCubeRequest(request);
    if (errors.length)
      throw new RangeError(
        `Invalid Gen3 GameCube request: ${errors.join(", ")}`,
      );
    if (options.signal?.aborted) {
      const totalStates =
        request.operation === "generator"
          ? request.maxAdvances + 1
          : gameCubeSearcherCombinationCount(request);
      return {
        processedStates: 0,
        totalStates,
        resultCount: 0,
        percent: 0,
        elapsedMs: 0,
        workerCount: 0,
        cancelled: true,
        resultLimitReached: false,
      };
    }
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGameCubeChunks(request);
    const requestedWorkerCount =
      options.workerCount ?? recommendedGameCubeWorkerCount();
    const workerCount = Math.min(
      Math.max(
        1,
        Number.isInteger(requestedWorkerCount) ? requestedWorkerCount : 1,
      ),
      8,
      chunks.length || 1,
    );
    const maxResults = Math.max(
      1,
      Math.min(
        options.maxResults ?? GEN3_GAMECUBE_MAX_RESULTS,
        GEN3_GAMECUBE_MAX_RESULTS,
      ),
    );
    const pendingBatches = new Map<number, ArrayBuffer>();
    const taskId = crypto.randomUUID();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;
    let stopped = false;
    const cancel = () => {
      if (stopped) return;
      cancelled = true;
      stopped = true;
      this.resetClients();
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });
    const report = () =>
      options.onProgress?.({
        processedStates,
        totalStates: chunks.reduce(
          (total, chunk) => total + chunk.stateCount,
          0,
        ),
        resultCount,
        percent:
          chunks.length === 0
            ? 100
            : (processedStates /
                chunks.reduce((total, chunk) => total + chunk.stateCount, 0)) *
              100,
      });
    const flush = () => {
      while (pendingBatches.has(nextBatch) && !stopped) {
        const states = decodeGameCubeStates(pendingBatches.get(nextBatch)!);
        pendingBatches.delete(nextBatch++);
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
        if (resultCount >= maxResults && nextBatch < chunks.length) {
          resultLimitReached = true;
          stopped = true;
          this.resetClients();
          return;
        }
      }
    };
    try {
      this.clients = Array.from(
        { length: workerCount },
        (_, index) => new GameCubeWorkerClient(index, this.moduleUrl),
      );
      const work = async (client: GameCubeWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.search(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.stateCount;
            resultLimitReached ||= batch.resultLimitReached;
            flush();
            report();
          } catch (error) {
            if (!cancelled && !stopped) throw error;
          }
        }
      };
      await Promise.all(this.clients.map(work));
      flush();
      return {
        processedStates,
        totalStates: chunks.reduce(
          (total, chunk) => total + chunk.stateCount,
          0,
        ),
        resultCount,
        percent:
          chunks.length === 0
            ? 100
            : (processedStates /
                chunks.reduce((total, chunk) => total + chunk.stateCount, 0)) *
              100,
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
        resultLimitReached,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
      this.resetClients();
      this.cancelActive = undefined;
      this.running = false;
    }
  }

  cancel() {
    this.cancelActive?.();
  }
  dispose() {
    this.resetClients();
  }
  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
