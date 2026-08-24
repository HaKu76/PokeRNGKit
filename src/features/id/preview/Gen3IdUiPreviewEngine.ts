import { ID3_MAX_RESULTS, type Id3Request, type Id3State } from "../domain";
import type {
  Id3SearchEngine,
  Id3SearchOptions,
  Id3SearchProgress,
  Id3SearchSummary,
} from "../search";

const PREVIEW_SAMPLE_LIMIT = 500;
const PREVIEW_STEP_LIMIT = 8;

function previewState(
  request: Id3Request,
  sampleIndex: number,
  sampleCount: number,
  totalStates: number,
): Id3State {
  const offset =
    sampleCount <= 1
      ? 0
      : Math.floor((sampleIndex * (totalStates - 1)) / (sampleCount - 1));
  const advances = request.initialAdvances + offset;
  const modeSalt =
    request.mode === "xd-colo"
      ? 0x9e37_79b9
      : request.mode === "fr-lg"
        ? 0x7f4a_7c15
        : 0x94d0_49bb;
  let mixed =
    (request.input ^ Math.imul(advances, 0x045d_9f3b) ^ modeSalt) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x045d_9f3b) >>> 0;
  mixed = (mixed ^ (mixed >>> 16)) >>> 0;

  const tid = mixed & 0xffff;
  const sid = mixed >>> 16;
  return {
    advances,
    tid,
    sid,
    tsv: (tid ^ sid) >>> 3,
    shiny:
      request.filters.pid === undefined
        ? 0
        : (tid ^
              sid ^
              (request.filters.pid >>> 16) ^
              (request.filters.pid & 0xffff)) ===
            0
          ? 2
          : (tid ^
                sid ^
                (request.filters.pid >>> 16) ^
                (request.filters.pid & 0xffff)) <
              8
            ? 1
            : 0,
  };
}

function matchesFilters(request: Id3Request, state: Id3State): boolean {
  const shinyMatches =
    request.filters.shiny === undefined ||
    request.filters.shiny === "any" ||
    (request.filters.shiny === "star" && state.shiny === 1) ||
    (request.filters.shiny === "square" && state.shiny === 2) ||
    (request.filters.shiny === "star-square" && state.shiny !== 0);
  return (
    (request.filters.tid === undefined || state.tid === request.filters.tid) &&
    (request.filters.sid === undefined || state.sid === request.filters.sid) &&
    (request.filters.tsv === undefined || state.tsv === request.filters.tsv) &&
    shinyMatches
  );
}

function pause(delayMs: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
}

export class Gen3IdUiPreviewEngine implements Id3SearchEngine {
  private running = false;
  private cancelActive?: () => void;

  constructor(private readonly stepDelayMs = 45) {}

  async search(
    request: Id3Request,
    options: Id3SearchOptions = {},
  ): Promise<Id3SearchSummary> {
    if (this.running) {
      throw new Error("An ID3 UI preview is already running.");
    }
    this.running = true;

    const startedAt = performance.now();
    const totalStates = request.maxAdvances + 1;
    const sampleCount = Math.min(totalStates, PREVIEW_SAMPLE_LIMIT);
    const stepCount = Math.min(sampleCount, PREVIEW_STEP_LIMIT);
    const maxResults = options.maxResults ?? ID3_MAX_RESULTS;
    let processedStates = 0;
    let resultCount = 0;
    let cancelled = options.signal?.aborted ?? false;
    let resultLimitReached = false;

    const cancel = () => {
      cancelled = true;
    };
    this.cancelActive = cancel;
    options.signal?.addEventListener("abort", cancel, { once: true });

    const report = (): Id3SearchProgress => {
      const progress = {
        processedStates,
        totalStates,
        resultCount,
        percent: (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return progress;
    };

    try {
      for (let step = 0; step < stepCount && !cancelled; step++) {
        await pause(this.stepDelayMs);
        if (cancelled) break;

        const start = Math.floor((step * sampleCount) / stepCount);
        const end = Math.floor(((step + 1) * sampleCount) / stepCount);
        const batch: Id3State[] = [];

        for (let index = start; index < end; index++) {
          const state = previewState(request, index, sampleCount, totalStates);
          if (matchesFilters(request, state)) {
            batch.push(state);
          }
        }

        const remaining = maxResults - resultCount;
        const accepted = batch.slice(0, Math.max(0, remaining));
        if (accepted.length > 0) {
          options.onBatch?.(accepted);
          resultCount += accepted.length;
        }
        if (batch.length > remaining) {
          resultLimitReached = true;
        }

        processedStates = Math.floor(((step + 1) * totalStates) / stepCount);
        report();
        if (resultLimitReached) break;
      }

      const progress = report();
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 0,
        cancelled,
        resultLimitReached,
      };
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
    this.cancel();
  }
}
