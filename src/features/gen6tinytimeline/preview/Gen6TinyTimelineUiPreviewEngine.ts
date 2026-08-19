import {
  validateGen6TinyTimelineRequest,
  type Gen6TinyTimelineRequest,
} from "../domain";
import type {
  Gen6TinyTimelineEngine,
  Gen6TinyTimelineSearchOptions,
  Gen6TinyTimelineSummary,
} from "../search";

export class Gen6TinyTimelineUiPreviewEngine implements Gen6TinyTimelineEngine {
  private cancelled = false;

  async search(
    request: Gen6TinyTimelineRequest,
    options: Gen6TinyTimelineSearchOptions = {},
  ): Promise<Gen6TinyTimelineSummary> {
    validateGen6TinyTimelineRequest(request);
    this.cancelled = false;
    const totalStates = Math.min(
      request.targetFrame - request.startingFrame + 1,
      96,
    );
    const results = [] as Awaited<
      ReturnType<Gen6TinyTimelineUiPreviewEngine["sample"]>
    >[];
    const startedAt = performance.now();
    for (let index = 0; index < totalStates; index += 1) {
      if (this.cancelled || options.signal?.aborted) break;
      results.push(this.sample(request, index));
      if (index % 8 === 0) {
        options.onBatch?.(results.splice(0));
        options.onProgress?.({
          processedStates: index + 1,
          totalStates,
          resultCount: index + 1,
          percent: ((index + 1) / totalStates) * 100,
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    if (results.length) options.onBatch?.(results);
    const processedStates = this.cancelled ? 0 : totalStates;
    options.onProgress?.({
      processedStates,
      totalStates,
      resultCount: totalStates,
      percent: totalStates ? (processedStates / totalStates) * 100 : 100,
    });
    return {
      processedStates,
      totalStates,
      resultCount: totalStates,
      percent: totalStates ? (processedStates / totalStates) * 100 : 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 0,
      cancelled: this.cancelled,
      resultLimitReached: false,
    };
  }

  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancelled = true;
  }

  private sample(request: Gen6TinyTimelineRequest, index: number) {
    const frame = request.startingFrame + index;
    const seed = (request.state[0] ^ Math.imul(index + 1, 0x9e3779b9)) >>> 0;
    return {
      index,
      frameMin: frame,
      frameMax: frame,
      hitIndex: index,
      rand: seed,
      state: [seed, request.state[1], request.state[2], request.state[3]] as [
        number,
        number,
        number,
        number,
      ],
      sync: (seed & 1) === 0,
      encounter: seed % 100,
      slot: (seed % 12) + 1,
      flute: request.isOras ? (seed % 4) + 1 : 0,
      item: seed % 100,
      music: seed % 100 < 2 ? "A" : seed % 100 > 49 ? "M" : "-",
      hordeHa: request.method === 2 ? (seed % 5) + 1 : 0,
      method: request.method,
      radarOverview: undefined,
    };
  }
}
