import type { Id3SearcherRequest, Id3SearcherState } from "../domain";
import type {
  Id3SearcherEngine,
  Id3SearcherOptions,
  Id3SearcherSummary,
} from "../searcher";

const SAMPLE: Id3SearcherState[] = [
  {
    seed: 0x05a0,
    frame: 0,
    tid: 48163,
    sid: 64377,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 1,
    day: 1,
    hour: 0,
    minute: 0,
  },
  {
    seed: 0xc19b,
    frame: 36724,
    tid: 48163,
    sid: 64377,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 2,
    day: 2,
    hour: 22,
    minute: 3,
  },
  {
    seed: 0x7b6b,
    frame: 93419,
    tid: 48163,
    sid: 64379,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 1,
    day: 21,
    hour: 16,
    minute: 23,
  },
  {
    seed: 0x1aed,
    frame: 335926,
    tid: 48163,
    sid: 64380,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 1,
    day: 4,
    hour: 12,
    minute: 35,
  },
  {
    seed: 0xdf77,
    frame: 81010,
    tid: 48163,
    sid: 64381,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 2,
    day: 8,
    hour: 10,
    minute: 57,
  },
  {
    seed: 0x8882,
    frame: 46414,
    tid: 48163,
    sid: 64382,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 1,
    day: 24,
    hour: 5,
    minute: 56,
  },
  {
    seed: 0x75f2,
    frame: 7164,
    tid: 48163,
    sid: 64383,
    tsv: 2283,
    shiny: 0,
    year: 2000,
    month: 7,
    day: 20,
    hour: 17,
    minute: 52,
  },
];

export class Gen3IdSearcherUiPreviewEngine implements Id3SearcherEngine {
  private cancelled = false;

  constructor(private readonly delayMs = 45) {}

  async search(
    request: Id3SearcherRequest,
    options: Id3SearcherOptions = {},
  ): Promise<Id3SearcherSummary> {
    const startedAt = performance.now();
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => this.cancel();
    options.signal?.addEventListener("abort", cancel, { once: true });
    options.onProgress?.({
      processedTasks: 0,
      totalTasks: 1,
      resultCount: 0,
      percent: 0,
    });
    try {
      await new Promise((resolve) =>
        globalThis.setTimeout(resolve, this.delayMs),
      );
      const matches =
        request.tid === 48163 &&
        ((request.mode === "sid" && request.input === 64377) ||
          (request.mode === "pid" && request.input === 0x0000475a));
      const states =
        this.cancelled || !matches
          ? []
          : SAMPLE.filter(
              (state) => request.mode === "pid" || state.sid === request.input,
            ).map((state) => ({
              ...state,
              shiny:
                request.mode === "pid"
                  ? state.sid === 64377
                    ? (2 as const)
                    : (1 as const)
                  : (0 as const),
            }));
      if (states.length > 0) options.onBatch?.(states);
      const progress = {
        processedTasks: this.cancelled ? 0 : 1,
        totalTasks: 1,
        resultCount: states.length,
        percent: this.cancelled ? 0 : 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 0,
        cancelled: this.cancelled,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  cancel() {
    this.cancelled = true;
  }
  dispose() {
    this.cancel();
  }
}
