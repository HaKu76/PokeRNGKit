import {
  GEN7_EGG_SEED_FINDER_PREVIEW_LIMIT,
  validateGen7EggSeedSearchRequest,
  validateGen7MagikarpRequest,
  type Gen7EggSeedSearchRequest,
  type Gen7EggSeedState,
  type Gen7EggSeedSummary,
  type Gen7MagikarpRequest,
} from "../domain";
import type { Gen7EggSeedEngine, Gen7EggSeedSearchOptions } from "../search";

class TinyMT {
  private state: [number, number, number, number];
  constructor(seed: number) {
    this.state = [seed >>> 0, 0x8f7011ee, 0xfc78ff1f, 0x3793fdff];
    for (let i = 1; i < 8; i += 1)
      this.state[i & 3] =
        (this.state[i & 3] ^
          (i +
            Math.imul(
              1812433253,
              this.state[(i - 1) & 3] ^ (this.state[(i - 1) & 3] >>> 30),
            ))) >>>
        0;
    if (
      (this.state[0] & 0x7fffffff) === 0 &&
      this.state[1] === 0 &&
      this.state[2] === 0 &&
      this.state[3] === 0
    )
      this.state = [84, 73, 78, 89];
    for (let i = 0; i < 8; i += 1) this.next();
  }
  next() {
    let y = this.state[3];
    let x =
      ((this.state[0] & 0x7fffffff) ^ this.state[1] ^ this.state[2]) >>> 0;
    x = (x ^ (x << 1)) >>> 0;
    y = (y ^ (y >>> 1) ^ x) >>> 0;
    this.state = [this.state[1], this.state[2], (x ^ (y << 10)) >>> 0, y];
    if ((y & 1) !== 0)
      this.state = [
        this.state[0],
        (this.state[1] ^ 0x8f7011ee) >>> 0,
        (this.state[2] ^ 0xfc78ff1f) >>> 0,
        this.state[3],
      ];
  }
  nextUint() {
    this.next();
    let t = (this.state[3] ^ (this.state[0] + (this.state[2] >>> 8))) >>> 0;
    if (((this.state[0] + (this.state[2] >>> 8)) & 1) !== 0)
      t = (t ^ 0x3793fdff) >>> 0;
    return t;
  }
  current() {
    return this.state.slice() as [number, number, number, number];
  }
}

function generateRest(rng: TinyMT, advance: number) {
  rng.next();
  const first = rng.nextUint() % 6;
  rng.next();
  let second = rng.nextUint() % 6;
  while (second === first) {
    second = rng.nextUint() % 6;
  }
  rng.next();
  let third = rng.nextUint() % 6;
  while (third === first || third === second) {
    third = rng.nextUint() % 6;
  }
  for (let i = 0; i < advance; i += 1) rng.next();
}

function matches(rng: TinyMT, natures: readonly number[], advance: number) {
  for (let i = 0; i < 7; i += 1) {
    rng.next();
    if (rng.nextUint() % 25 !== natures[i]) return false;
    generateRest(rng, advance);
  }
  rng.next();
  return rng.nextUint() % 25 === natures[7];
}

export class Gen7EggSeedFinderUiPreviewEngine implements Gen7EggSeedEngine {
  private stopped = false;
  async search(
    request: Gen7EggSeedSearchRequest,
    options: Gen7EggSeedSearchOptions = {},
  ): Promise<Gen7EggSeedSummary> {
    validateGen7EggSeedSearchRequest(request);
    this.stopped = false;
    const startedAt = performance.now();
    const endSeed = Math.min(
      request.endSeed,
      request.startSeed + GEN7_EGG_SEED_FINDER_PREVIEW_LIMIT - 1,
    );
    const results: Gen7EggSeedState[] = [];
    const totalStates = endSeed - request.startSeed + 1;
    const advance = request.shinyCharm ? 12 : 10;
    for (
      let seed = request.startSeed;
      seed <= endSeed && !this.stopped;
      seed += 1
    ) {
      const rng = new TinyMT(seed);
      if (matches(rng, request.natureList, advance)) {
        const state = { state: new TinyMT(seed).current() };
        results.push(state);
        options.onBatch?.([state]);
      }
      const processed = seed - request.startSeed + 1;
      options.onProgress?.({
        processedStates: processed,
        totalStates,
        resultCount: results.length,
        percent: (processed / totalStates) * 100,
      });
      if (seed === 0xffff_ffff) break;
    }
    return {
      results,
      processedStates: totalStates,
      totalStates,
      resultCount: results.length,
      percent: 100,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: this.stopped,
    };
  }
  async magikarp(request: Gen7MagikarpRequest) {
    validateGen7MagikarpRequest(request);
    // Preview keeps the input workflow responsive; the production Worker uses the upstream GF(2) matrix.
    const words: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < request.bits.length; i += 1)
      if (request.bits[i] === "1") words[Math.floor(i / 32)] |= 1 << (i % 32);
    return { state: words };
  }
  cancel() {
    this.stopped = true;
  }
  dispose() {
    this.stopped = true;
  }
}
