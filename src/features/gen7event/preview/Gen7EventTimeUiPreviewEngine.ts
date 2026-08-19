import {
  gen7EventTimeResultPassesFilters,
  gen7EventTimeTaskCount,
  validateGen7EventTimeRequest,
  type Gen7EventTimeIvTuple,
  type Gen7EventTimeRequest,
  type Gen7EventTimeResult,
} from "../timeDomain";
import type {
  Gen7EventTimeEngine,
  Gen7EventTimeSearchOptions,
  Gen7EventTimeSummary,
} from "../timeSearch";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function hiddenPower(ivs: Gen7EventTimeIvTuple) {
  const order = [0, 1, 2, 5, 3, 4];
  const value = order.reduce(
    (sum, index, bit) => sum + ((ivs[index] & 1) << bit),
    0,
  );
  return Math.floor((value * 15) / 63);
}

function previewResult(
  request: Gen7EventTimeRequest,
  epoch: bigint,
  frame: number,
): Gen7EventTimeResult {
  const epochLow = Number(epoch & 0xffff_ffffn);
  const seed = mix(epochLow ^ request.tick ^ Math.imul(frame, 0x9e3779b9));
  const high = mix(seed ^ 0xa5a5a5a5);
  const event = request.event;
  const profileXor = request.profileTid ^ request.profileSid;
  const tsv = event.yourId ? profileXor : event.tid ^ event.sid;
  let pid = event.pidType === "specified" ? event.pid : mix(high ^ 0x7f4a7c15);
  if (event.pidType === "shiny" && event.otherInfo) {
    const low = pid & 0xffff;
    pid = (((event.tid ^ event.sid ^ low) << 16) | low) >>> 0;
  }
  let xorValue = (pid >>> 16) ^ (pid & 0xffff);
  let shiny = xorValue === tsv ? 2 : (xorValue ^ tsv) < 16 ? 1 : 0;
  if (event.pidType === "nonshiny" && shiny !== 0) {
    pid = (pid ^ 0x10000000) >>> 0;
    xorValue = (pid >>> 16) ^ (pid & 0xffff);
    shiny = xorValue === tsv ? 2 : (xorValue ^ tsv) < 16 ? 1 : 0;
  }
  const ivs = event.fixedIvs.map((iv, index) =>
    iv >= 0 ? iv : (mix(seed + index * 0x10203) >>> 8) & 0x1f,
  ) as Gen7EventTimeIvTuple;
  const open = ivs
    .map((_, index) => index)
    .filter((index) => event.fixedIvs[index] < 0);
  for (
    let index = 0;
    index < event.randomPerfectIvCount && index < open.length;
    index++
  )
    ivs[open[(mix(high + index) >>> 8) % open.length]] = 31;
  const gender = event.genderLocked
    ? event.gender + 1
    : mix(pid ^ seed) % 252 < event.gender
      ? 1
      : 2;
  const ability = event.abilityLocked
    ? event.ability + 1
    : event.ability === 0
      ? (mix(pid ^ 0x55aa55aa) & 1) + 1
      : (mix(pid ^ 0x55aa55aa) % 3) + 1;
  return {
    frame,
    ec: event.ec > 0 ? event.ec : mix(seed ^ 0x31415926),
    pid,
    ivs,
    nature: event.natureLocked ? event.nature : mix(pid) % 25,
    ability,
    gender,
    hiddenPower: hiddenPower(ivs),
    shiny,
    initialSeed: seed,
    epoch,
  };
}

export class Gen7EventTimeUiPreviewEngine implements Gen7EventTimeEngine {
  private cancelled = false;

  async search(
    request: Gen7EventTimeRequest,
    options: Gen7EventTimeSearchOptions = {},
  ): Promise<Gen7EventTimeSummary> {
    validateGen7EventTimeRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7EventTimeTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, options.maxResults ?? 100_000),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7EventTimeResult[] = [];
    let processedStates = 0;
    try {
      const frameCount = request.maxFrame - request.minFrame + 1;
      for (let index = 0; index < totalStates && !this.cancelled; index++) {
        const epoch =
          request.startEpoch + BigInt(Math.floor(index / frameCount)) * 1000n;
        const frame = request.minFrame + (index % frameCount);
        const result = previewResult(request, epoch, frame);
        processedStates++;
        if (gen7EventTimeResultPassesFilters(request, result))
          accepted.push(result);
        if (accepted.length >= resultLimit) break;
      }
      if (accepted.length) options.onBatch?.(accepted);
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
