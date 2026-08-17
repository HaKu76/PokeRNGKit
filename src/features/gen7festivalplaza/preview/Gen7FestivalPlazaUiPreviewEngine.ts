import {
  GEN7_FESTIVAL_PLAZA_MAX_RESULTS,
  gen7FestivalPlazaFacilityPool,
  gen7FestivalPlazaTaskCount,
  validateGen7FestivalPlazaRequest,
  type Gen7FestivalPlazaRequest,
  type Gen7FestivalPlazaResult,
} from "../domain";
import type {
  Gen7FestivalPlazaEngine,
  Gen7FestivalPlazaSearchOptions,
  Gen7FestivalPlazaSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(
  request: Gen7FestivalPlazaRequest,
  frame: number,
): Gen7FestivalPlazaResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const high = mix(low ^ request.rank ^ 0xa5a5a5a5);
  const random = (BigInt(high) << 32n) | BigInt(low);
  const star = request.starFilter || Number(random % 5n) + 1;
  const pool = gen7FestivalPlazaFacilityPool(request.version, star);
  const facility =
    request.facilityFilter === -1
      ? pool[Number(random % BigInt(pool.length))]
      : request.facilityFilter;
  const npcType =
    request.npcTypeFilter === -1
      ? Number((random >> 8n) % 12n)
      : request.npcTypeFilter;
  const color =
    request.colorFilter === -1
      ? Number((random >> 16n) % 4n)
      : request.colorFilter;
  return {
    frame,
    actualFrame:
      frame + Math.trunc(request.delay / 2) * Math.max(1, request.npc + 1),
    realTimeFrames: (frame - request.minFrame) * 2,
    random,
    star,
    facility,
    npcType,
    color,
    blink: frame % 97 === 0 ? 1 : 0,
    clock: Number(random % 17n),
    npcStatus: request.includeNpcStatus
      ? Array.from({ length: request.npc + 1 }, (_, index) =>
          Number((random >> BigInt(index % 32)) % 37n),
        )
      : [],
  };
}

export class Gen7FestivalPlazaUiPreviewEngine implements Gen7FestivalPlazaEngine {
  private cancelled = false;

  async search(
    request: Gen7FestivalPlazaRequest,
    options: Gen7FestivalPlazaSearchOptions = {},
  ): Promise<Gen7FestivalPlazaSummary> {
    validateGen7FestivalPlazaRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7FestivalPlazaTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults ?? GEN7_FESTIVAL_PLAZA_MAX_RESULTS,
      ),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7FestivalPlazaResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        accepted.push(previewResult(request, request.minFrame + offset));
        processedStates++;
        if (accepted.length >= resultLimit) break;
      }
      if (accepted.length !== 0) options.onBatch?.(accepted);
      const progress = {
        processedStates,
        totalStates,
        resultCount: accepted.length,
        percent:
          totalStates === 0 ? 100 : (processedStates / totalStates) * 100,
      };
      options.onProgress?.(progress);
      return {
        ...progress,
        elapsedMs: performance.now() - startedAt,
        workerCount: 1,
        cancelled: this.cancelled,
        resultLimitReached:
          accepted.length >= resultLimit && processedStates < totalStates,
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
