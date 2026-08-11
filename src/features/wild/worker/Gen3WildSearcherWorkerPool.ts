import {
  createGen3WildSearcherChunks,
  decodeGen3WildSearcherStates,
  gen3WildSearcherCombinationCount,
  GEN3_WILD_MAX_RESULTS,
  GEN3_WILD_SEARCHER_CHUNK_SIZE,
  type Gen3WildSearcherChunk,
  type Gen3WildSearcherRequest,
} from "../domain";
import type { Gen3WildSearchSummary } from "../search";
import type {
  Gen3WildSearcherEngine,
  Gen3WildSearcherOptions,
} from "../searcher";
import {
  defaultGen3WildModuleUrl,
  Gen3WildWorkerClient,
  recommendedGen3WildWorkerCount,
} from "./Gen3WildWorkerPool";

export class Gen3WildSearcherWorkerPool implements Gen3WildSearcherEngine {
  private clients: Gen3WildWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen3WildModuleUrl()) {}

  async search(
    request: Gen3WildSearcherRequest,
    options: Gen3WildSearcherOptions = {},
  ): Promise<Gen3WildSearchSummary> {
    if (this.running) throw new Error("A Gen3 wild search is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen3WildSearcherChunks(
      request,
      options.chunkSize ?? GEN3_WILD_SEARCHER_CHUNK_SIZE,
    );
    const totalStates = gen3WildSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen3WildWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN3_WILD_MAX_RESULTS;
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
        const states = decodeGen3WildSearcherStates(
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
      const work = async (client: Gen3WildWorkerClient) => {
        while (!stopped) {
          const chunk: Gen3WildSearcherChunk | undefined = chunks[nextChunk++];
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
      (_, index) => new Gen3WildWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
