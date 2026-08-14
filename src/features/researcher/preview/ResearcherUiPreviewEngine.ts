import type { ResearcherRequest, ResearcherRow } from "../domain";
import type {
  ResearcherEngine,
  ResearcherGenerateOptions,
  ResearcherSummary,
} from "../search";

/**
 * The UI build uses a small deterministic sample so layout and state can be
 * reviewed without loading production WebAssembly.
 */
export class ResearcherUiPreviewEngine implements ResearcherEngine {
  private controller?: AbortController;

  async generate(
    request: ResearcherRequest,
    options: ResearcherGenerateOptions = {},
  ): Promise<ResearcherSummary> {
    this.controller = new AbortController();
    const startedAt = performance.now();
    const count = Math.min(request.maxAdvances, 128);
    const rows: ResearcherRow[] = [];
    for (let index = 0; index < count; index++) {
      if (options.signal?.aborted || this.controller.signal.aborted)
        return {
          rows,
          processedStates: index,
          totalStates: count,
          elapsedMs: performance.now() - startedAt,
          workerCount: 1,
          cancelled: true,
        };
      const seed = BigInt(request.seedWords[0] ?? 0);
      const prng = BigInt.asUintN(64, seed + BigInt(index + 1) * 0x9e3779b9n);
      const row = {
        advances: request.initialAdvances + index,
        prng,
        customs: request.customs.map((spec, custom) =>
          spec.enabled ? BigInt.asUintN(64, prng + BigInt(custom + 1)) : 0n,
        ),
      };
      rows.push(row);
      options.onBatch?.([row]);
      options.onProgress?.(index + 1, count);
      await Promise.resolve();
    }
    this.controller = undefined;
    return {
      rows,
      processedStates: count,
      totalStates: count,
      elapsedMs: performance.now() - startedAt,
      workerCount: 1,
      cancelled: false,
    };
  }

  cancel() {
    this.controller?.abort();
  }

  dispose() {
    this.cancel();
  }
}
