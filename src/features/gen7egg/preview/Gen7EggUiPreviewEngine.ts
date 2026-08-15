import {
  GEN7_EGG_MAX_RESULTS,
  gen7EggResultPassesFilters,
  gen7EggTaskCount,
  validateGen7EggExecutionRequest,
  type Gen7EggAction,
  type Gen7EggIvTuple,
  type Gen7EggRequest,
  type Gen7EggResult,
  type Gen7EggState,
} from "../domain";
import type {
  Gen7EggEngine,
  Gen7EggSearchOptions,
  Gen7EggSummary,
} from "../search";

function mix(value: number) {
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function hiddenPower(ivs: readonly number[]) {
  const order = [0, 1, 2, 4, 5, 3];
  const bits = ivs.reduce(
    (sum, iv, index) => sum + ((iv & 1) << order[index]),
    0,
  );
  return Math.trunc((15 * bits) / 63);
}

function previewState(request: Gen7EggRequest, frame: number): Gen7EggState {
  return request.state.map((value, index) =>
    mix(value ^ Math.imul(frame + index, 0x9e37_79b9)),
  ) as Gen7EggState;
}

function previewResult(
  request: Gen7EggRequest,
  frame: number,
  eggNumber: number,
  action: Gen7EggAction = "none",
): Gen7EggResult {
  const state = previewState(request, frame);
  const random = mix(state[0] ^ state[3]);
  const framesUsed = 17 + (random % 8);
  const afterState = previewState(request, frame + framesUsed);
  const ivs = [0, 1, 2, 3, 4, 5].map(
    (index) => mix(random + index * 0x10203) & 0x1f,
  ) as Gen7EggIvTuple;
  const pid =
    request.shinyCharm || request.masudaMethod ? mix(random ^ 0x7f4a_7c15) : 0;
  const xorValue = (pid >>> 16) ^ (pid & 0xffff);
  const psv = xorValue >>> 4;
  const prv = xorValue & 0xf;
  const inheritedMaleMask = 1 << (random % 6);
  const inheritedFemaleMask = 1 << (mix(random) % 6);
  return {
    frame,
    eggNumber,
    state,
    afterState,
    random,
    ec: mix(random ^ 0x3141_5926),
    pid,
    ivs,
    nature: mix(random ^ 0xa5a5_a5a5) % 25,
    ability: (mix(random ^ 0x55aa_55aa) % 3) + 1,
    gender:
      request.genderRatio === "genderless"
        ? 0
        : request.genderRatio === "male-only"
          ? 1
          : request.genderRatio === "female-only"
            ? 2
            : (mix(random ^ 0x1111_2222) & 1) + 1,
    hiddenPower: hiddenPower(ivs),
    shiny: psv === request.tsv,
    squareShiny: psv === request.tsv && prv === request.trv,
    ball: request.female.ditto
      ? "male"
      : request.homogeneous && (random & 1) === 0
        ? "male"
        : "female",
    natureParent:
      request.male.item === "everstone" && request.female.item === "everstone"
        ? (random & 1) === 0
          ? "male"
          : "female"
        : request.male.item === "everstone"
          ? "male"
          : request.female.item === "everstone"
            ? "female"
            : "any",
    action,
    framesUsed,
    inheritedMaleMask,
    inheritedFemaleMask,
    psv,
    prv,
  };
}

function yieldToMainThread() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function buildShortestPath(
  request: Gen7EggRequest,
  target: number,
  isCancelled: () => boolean,
) {
  const previous = new Uint32Array(target + 1);
  const weights = new Uint32Array(target + 1);
  weights.fill(0xffff_ffff);
  weights[0] = 0;
  for (let index = 0; index <= target; index++) {
    if (isCancelled()) return { path: [], processedStates: index };
    if (index !== 0 && weights[index] > weights[index - 1] + 1) {
      previous[index] = index - 1;
      weights[index] = weights[index - 1] + 1;
    }
    const next = index + previewResult(request, index, 0).framesUsed;
    if (next <= target && weights[next] > weights[index] + 1) {
      previous[next] = index;
      weights[next] = weights[index] + 1;
    }
    if ((index & 0xff) === 0xff) await yieldToMainThread();
  }
  const path: number[] = [];
  for (let node = target; ; node = previous[node]) {
    path.push(node);
    if (node === 0) break;
  }
  return { path: path.reverse(), processedStates: target + 1 };
}

export class Gen7EggUiPreviewEngine implements Gen7EggEngine {
  private cancelled = false;

  async search(
    request: Gen7EggRequest,
    options: Gen7EggSearchOptions = {},
  ): Promise<Gen7EggSummary> {
    validateGen7EggExecutionRequest(request);
    const startedAt = performance.now();
    const totalStates = Math.min(gen7EggTaskCount(request), 5_000);
    const resultLimit = Math.max(
      1,
      Math.min(request.resultLimit, options.maxResults ?? GEN7_EGG_MAX_RESULTS),
    );
    this.cancelled = options.signal?.aborted ?? false;
    const cancel = () => {
      this.cancelled = true;
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    const accepted: Gen7EggResult[] = [];
    let processedStates = 0;
    let targetFound = false;
    let acceptedEggs = 0;
    let rejectedEggs = 0;
    let shortestPathResultCount = 0;
    try {
      if (request.mode === "shortest-path") {
        const target = Math.min(request.targetFrame, totalStates - 1);
        const pathResult = await buildShortestPath(
          request,
          target,
          () => this.cancelled,
        );
        processedStates = pathResult.processedStates;
        shortestPathResultCount = pathResult.path.length;
        for (const [index, frame] of pathResult.path.entries()) {
          if (this.cancelled || accepted.length >= resultLimit) break;
          const next = pathResult.path[index + 1];
          const action =
            next === undefined || next - frame > 1 ? "accept" : "reject";
          if (index + 1 < pathResult.path.length) {
            if (action === "accept") acceptedEggs++;
            else rejectedEggs++;
          }
          accepted.push(previewResult(request, frame, index + 1, action));
        }
        targetFound = !this.cancelled;
      } else if (request.mode === "egg-list") {
        let frame = 0;
        for (
          let egg = 1;
          egg <= totalStates &&
          !this.cancelled &&
          accepted.length < resultLimit;
          egg++
        ) {
          const result = previewResult(request, frame, egg);
          processedStates++;
          if (
            !targetFound &&
            frame <= request.targetFrame &&
            request.targetFrame < frame + result.framesUsed
          ) {
            targetFound = true;
            acceptedEggs = egg - 1;
            rejectedEggs = request.targetFrame - frame;
          }
          if (
            egg >= request.minEgg &&
            gen7EggResultPassesFilters(request, result)
          ) {
            accepted.push(result);
          }
          frame += result.framesUsed;
        }
      } else {
        for (
          let offset = 0;
          offset < totalStates &&
          !this.cancelled &&
          accepted.length < resultLimit;
          offset++
        ) {
          const result = previewResult(request, request.minFrame + offset, 0);
          processedStates++;
          if (gen7EggResultPassesFilters(request, result))
            accepted.push(result);
        }
      }
      if (accepted.length !== 0)
        options.onBatch?.(accepted.slice(0, resultLimit));
      const progress = {
        processedStates,
        totalStates,
        resultCount: Math.min(accepted.length, resultLimit),
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
          accepted.length >= resultLimit &&
          (processedStates < totalStates ||
            (request.mode === "shortest-path" &&
              accepted.length < shortestPathResultCount)),
        targetFound,
        acceptedEggs,
        rejectedEggs,
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
