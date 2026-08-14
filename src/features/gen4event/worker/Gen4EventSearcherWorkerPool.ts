import {
  createGen4EventSearcherChunks,
  decodeGen4EventSearcherStates,
  gen4EventSearcherCombinationCount,
  GEN4_EVENT_CHUNK_SIZE,
  GEN4_EVENT_MAX_RESULTS,
  type Gen4EventSearcherRequest,
} from "../domain";
import type {
  Gen4EventSearcherEngine,
  Gen4EventSearcherOptions,
  Gen4EventSummary,
} from "../search";
import {
  defaultGen4EventModuleUrl,
  Gen4EventWorkerClient,
  recommendedGen4EventWorkerCount,
} from "./Gen4EventWorkerPool";

export class Gen4EventSearcherWorkerPool implements Gen4EventSearcherEngine {
  private clients: Gen4EventWorkerClient[] = [];
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly moduleUrl = defaultGen4EventModuleUrl()) {}

  async search(
    request: Gen4EventSearcherRequest,
    options: Gen4EventSearcherOptions = {},
  ): Promise<Gen4EventSummary> {
    if (this.running)
      throw new Error("A Gen4 event search is already running.");
    this.running = true;
    const startedAt = performance.now();
    const chunks = createGen4EventSearcherChunks(
      request,
      options.chunkSize ?? GEN4_EVENT_CHUNK_SIZE,
    );
    const totalStates = gen4EventSearcherCombinationCount(request);
    const workerCount = Math.min(
      options.workerCount ?? recommendedGen4EventWorkerCount(),
      chunks.length,
    );
    const maxResults = Math.min(
      options.maxResults ?? GEN4_EVENT_MAX_RESULTS,
      GEN4_EVENT_MAX_RESULTS,
    );
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
        const states = decodeGen4EventSearcherStates(
          pendingBatches.get(nextBatch)!,
        );
        pendingBatches.delete(nextBatch++);
        const visible = states.slice(0, Math.max(0, maxResults - resultCount));
        if (visible.length > 0) options.onBatch?.(visible);
        resultCount += visible.length;
        if (visible.length < states.length) {
          resultLimitReached = true;
          stopped = true;
          return;
        }
        if (resultCount >= maxResults) {
          resultLimitReached = true;
          stopped = true;
          return;
        }
      }
    };

    try {
      this.ensureClients(workerCount);
      const work = async (client: Gen4EventWorkerClient) => {
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
      (_, index) => new Gen4EventWorkerClient(index, this.moduleUrl),
    );
  }

  private resetClients() {
    for (const client of this.clients) client.terminate();
    this.clients = [];
  }
}
