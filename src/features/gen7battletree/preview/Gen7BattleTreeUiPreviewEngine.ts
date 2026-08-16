import {
  GEN7_BATTLETREE_MAX_RESULTS,
  gen7BattleTreeTaskCount,
  validateGen7BattleTreeRequest,
  type Gen7BattleTreeRequest,
  type Gen7BattleTreeResult,
} from "../domain";
import type {
  Gen7BattleTreeEngine,
  Gen7BattleTreeSearchOptions,
  Gen7BattleTreeSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function previewResult(
  request: Gen7BattleTreeRequest,
  frame: number,
): Gen7BattleTreeResult {
  const low = mix(request.seed ^ Math.imul(frame, 0x9e3779b9));
  const high = mix(low ^ request.streak ^ 0xa5a5a5a5);
  const random = (BigInt(high) << 32n) | BigInt(low);
  const specialIds =
    request.version === "sun"
      ? [197, 201, 199, 192, 194, 195, 196, 193]
      : request.version === "moon"
        ? [198, 202, 200, 192, 194, 195, 196, 193]
        : request.version === "ultra-sun"
          ? [197, 201, 199, 192, 194, 195, 196, 205, 193]
          : [198, 202, 200, 192, 194, 195, 196, 205, 193];
  const trainerId =
    request.streak % 10 === 0
      ? specialIds[Number(random % BigInt(specialIds.length))]
      : request.streak <= 10
        ? Number(random % 50n)
        : request.streak <= 50
          ? Math.trunc((request.streak - 1) / 10) * 20 +
            10 +
            Number(random % 40n)
          : 90 + Number(random % 100n);
  return {
    frame,
    actualFrame: frame + Math.trunc(request.delay / 2) + 4,
    realTimeFrames: (frame - request.minFrame) * 2,
    random,
    trainerId,
    blink: frame % 97 === 0 ? 1 : 0,
    clock: Number(random % 17n),
  };
}

export class Gen7BattleTreeUiPreviewEngine implements Gen7BattleTreeEngine {
  private cancelled = false;

  async search(
    request: Gen7BattleTreeRequest,
    options: Gen7BattleTreeSearchOptions = {},
  ): Promise<Gen7BattleTreeSummary> {
    validateGen7BattleTreeRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7BattleTreeTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(
        request.resultLimit,
        options.maxResults ?? GEN7_BATTLETREE_MAX_RESULTS,
      ),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7BattleTreeResult[] = [];
    let processedStates = 0;
    try {
      for (let offset = 0; offset < totalStates && !this.cancelled; offset++) {
        const result = previewResult(request, request.minFrame + offset);
        processedStates++;
        if (
          request.trainerFilter >= 209 ||
          request.trainerFilter === result.trainerId
        ) {
          accepted.push(result);
        }
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
