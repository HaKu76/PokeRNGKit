import {
  createGen4StaticSearcherChunks,
  decodeGen4StaticSearcherStates,
  gen4StaticSearcherCombinationCount,
  GEN4_STATIC_CHUNK_SIZE,
  GEN4_STATIC_MAX_RESULTS,
  type Gen4StaticSearcherRequest,
} from "../domain";
import type { Gen4StaticSummary } from "../search";
import type {
  Gen4StaticSearcherEngine,
  Gen4StaticSearcherOptions,
} from "../searcher";
import {
  defaultGen4StaticModuleUrl,
  Gen4StaticWorkerClient,
  recommendedGen4StaticWorkerCount,
} from "./Gen4StaticWorkerPool";

export class Gen4StaticSearcherWorkerPool implements Gen4StaticSearcherEngine {
  private clients: Gen4StaticWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen4StaticModuleUrl()) {}

  async search(
    request: Gen4StaticSearcherRequest,
    options: Gen4StaticSearcherOptions = {},
  ): Promise<Gen4StaticSummary> {
    if (this.running)
      throw new Error("A Gen4 static search is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4StaticSearcherChunks(
      request,
      options.chunkSize ?? GEN4_STATIC_CHUNK_SIZE,
    );
    const totalStates = gen4StaticSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4StaticWorkerCount(),
      chunks.length,
    );
    const maxResults = options.maxResults ?? GEN4_STATIC_MAX_RESULTS;
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
        const states = decodeGen4StaticSearcherStates(
          pendingBatches.get(nextBatch)!,
        );
        pendingBatches.delete(nextBatch++);
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
      this.ensureClients(workerCount);
      const work = async (client: Gen4StaticWorkerClient) => {
        while (!stopped) {
          const chunk = chunks[nextChunk++];
          if (!chunk) return;
          try {
            const batch = await client.search(taskId, request, chunk);
            if (stopped) return;
            pendingBatches.set(batch.chunkIndex, batch.buffer);
            processedStates += batch.processedCount;
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

  private ensureClients(count: number) {
    if (this.clients.length === count) return;
    this.resetClients();
    this.clients = Array.from(
      { length: count },
      (_, index) => new Gen4StaticWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
