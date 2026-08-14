import {
  gen5IdCandidateCount,
  validateGen5IdRequest,
  type Gen5IdRequest,
  type Gen5IdResult,
} from "../domain";
import type { Gen5IdEngine, Gen5IdOptions, Gen5IdSummary } from "../search";

function previewResult(request: Gen5IdRequest, index: number): Gen5IdResult {
  const date = request.mode === "search" ? request.startDate : request.date;
  const seconds = request.mode === "search" ? index : request.minSecond + index;
  const hour =
    request.mode === "search" ? Math.floor(seconds / 3600) : request.hour;
  const minute =
    request.mode === "search"
      ? Math.floor((seconds % 3600) / 60)
      : request.minute;
  const second = seconds % 60;
  const part = (value: number) => String(value).padStart(2, "0");
  const seed = BigInt(index + 1) * 0x5d588b656c078965n + 0x269ec3n;
  const tid =
    request.mode === "seedFinder" ? request.tid : (18185 + index) & 0xffff;
  const sid = (39382 + index * 31) & 0xffff;
  const initialAdvances = request.profile.version.endsWith("2") ? 34 : 25;
  return {
    seed: BigInt.asUintN(64, seed).toString(16).toUpperCase().padStart(16, "0"),
    initialAdvances,
    advances: initialAdvances + index,
    tid,
    sid,
    tsv: (tid ^ sid) >>> 3,
    dateTime: `${date} ${part(hour)}:${part(minute)}:${part(second)}`,
    timer0: request.profile.timer0Min,
    buttonMask: 0,
  };
}

export class Gen5IdUiPreviewEngine implements Gen5IdEngine {
  private cancelled = false;

  async search(
    request: Gen5IdRequest,
    options: Gen5IdOptions = {},
  ): Promise<Gen5IdSummary> {
    validateGen5IdRequest(request);
    const startedAt = performance.now();
    const totalSeeds = gen5IdCandidateCount(request);
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    try {
      const count = this.cancelled
        ? 0
        : Math.min(totalSeeds, 12, request.resultLimit);
      const results = Array.from({ length: count }, (_, index) =>
        previewResult(request, index),
      );
      if (results.length !== 0) options.onBatch?.(results);
      const processedSeeds = this.cancelled ? 0 : Math.min(totalSeeds, 12);
      const progress = {
        processedSeeds,
        totalSeeds,
        resultCount: results.length,
        percent: totalSeeds === 0 ? 100 : (processedSeeds / totalSeeds) * 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached: false,
      };
    } finally {
      options.signal?.removeEventListener("abort", cancel);
    }
  }

  cancel() {
    this.cancelled = true;
  }

  dispose() {
    this.cancelled = true;
  }
}
