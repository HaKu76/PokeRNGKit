import {
  createGen3StaticSearcherChunks,
  decodeGen3StaticSearcherStates,
  gen3StaticSearcherCombinationCount,
  GEN3_STATIC_CHUNK_SIZE,
  GEN3_STATIC_MAX_RESULTS,
  type Gen3StaticSearcherChunk,
  type Gen3StaticSearcherRequest,
} from "../domain";
import type {
  Gen3StaticSearcherEngine,
  Gen3StaticSearcherOptions,
} from "../searcher";
import type { Gen3StaticSearchSummary } from "../search";
import {
  defaultGen3StaticModuleUrl,
  Gen3StaticWorkerClient,
  recommendedGen3StaticWorkerCount,
} from "./Gen3StaticWorkerPool";

export class Gen3StaticSearcherWorkerPool implements Gen3StaticSearcherEngine {
  private clients: Gen3StaticWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3StaticModuleUrl()) {}

  async search(
    request: Gen3StaticSearcherRequest,
    options: Gen3StaticSearcherOptions = {},
  ): Promise<Gen3StaticSearchSummary> {
    if (this.running)
      throw new Error("A Gen3 static search is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3StaticSearcherChunks(
      request,
      options.chunkSize ?? GEN3_STATIC_CHUNK_SIZE,
    );
    const totalStates = gen3StaticSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen3StaticWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN3_STATIC_MAX_RESULTS;
    const taskId = crypto.randomUUID();
    const pendingBatches = new Map<number, ArrayBuffer>();
    let nextChunk = 0;
    let nextBatch = 0;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = false;
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

    const report = () => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    const flushBatches = () => {
      while (pendingBatches.has(nextBatch)) {
        const states = decodeGen3StaticSearcherStates(
          pendingBatches.get(nextBatch)!,
        );
        pendingBatches.delete(nextBatch);
        nextBatch++;
        const remaining = maxResults - resultCount;
        if (states.length > remaining) {
          options.onBatch?.(states.slice(0, Math.max(0, remaining)));
          resultCount = maxResults;
          resultLimitReached = true;
          stopped = true;
          return;
        }
        resultCount += states.length;
        options.onBatch?.(states);
      }
    };

    try {
      await this.ensureClients(workerCount);
      const work = async (client: Gen3StaticWorkerClient) => {
        while (!stopped) {
          const chunk: Gen3StaticSearcherChunk | undefined =
            chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.search(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.stateCount;
            flushBatches();
            report();
          } catch (error) {
            if (!cancelled) throw error;
          }
        }
      };
      await Promise.all(this.clients.slice(0, workerCount).map(work));
      flushBatches();
      return {
        ...report(),
        elapsedMs: performance.now() - startedAt,
        workerCount,
        cancelled,
        resultLimitReached,
      };
    } catch (error) {
      if (!cancelled) this.resetClients();
      throw error;
    } finally {
      options.signal?.removeEventListener("abort", cancel);
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

  private async ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen3StaticWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
