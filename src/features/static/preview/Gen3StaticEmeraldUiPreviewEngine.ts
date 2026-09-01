import {
  gen3StaticEmeraldWorkCount,
  matchingEmeraldSid,
  shinyXorsForFilter,
  type Gen3StaticEmeraldRequest,
  type Gen3StaticEmeraldState,
  type Gen3StaticRequest,
} from "../domain";
import type {
  Gen3StaticEmeraldSearchEngine,
  Gen3StaticEmeraldSearchOptions,
  Gen3StaticSearchSummary,
} from "../search";
import { Gen3StaticUiPreviewEngine } from "./Gen3StaticUiPreviewEngine";

export class Gen3StaticEmeraldUiPreviewEngine implements Gen3StaticEmeraldSearchEngine {
  private readonly generator: Gen3StaticUiPreviewEngine;

  constructor(stepDelayMs = 45) {
    this.generator = new Gen3StaticUiPreviewEngine(stepDelayMs);
  }

  async searchEmerald(
    request: Gen3StaticEmeraldRequest,
    options: Gen3StaticEmeraldSearchOptions = {},
  ): Promise<Gen3StaticSearchSummary> {
    const previewRequest: Gen3StaticRequest = {
      seed: request.tid ?? 0,
      initialAdvances: request.initialAdvances + request.offset,
      maxAdvances: request.maxAdvances,
      offset: 0,
      method: request.method,
      template: request.template,
      tid: request.tid ?? 0,
      sid: 0,
      filters: { ...request.filters, shiny: "any" },
    };
    const shinyXor = shinyXorsForFilter(request.filters.shiny)[0];
    const totalStates = gen3StaticEmeraldWorkCount(request);
    const previewStates = request.maxAdvances + 1;
    const workScale = totalStates / previewStates;
    let resultCount = 0;
    const summary = await this.generator.search(previewRequest, {
      ...options,
      onProgress: (progress) =>
        options.onProgress?.({
          ...progress,
          processedStates: Math.round(progress.processedStates * workScale),
          totalStates,
        }),
      onBatch: (states) => {
        const emeraldStates = states.flatMap<Gen3StaticEmeraldState>(
          (state) => {
            if (state.advances === 0 && shinyXor !== undefined) return [];
            const tid = request.tid ?? (state.pid ^ state.advances) & 0xffff;
            if (shinyXor === undefined) {
              return [
                {
                  ...state,
                  tid,
                  targetAdvances: state.advances,
                },
              ];
            }
            const sid = matchingEmeraldSid(tid, state.pid, shinyXor);
            return [
              {
                ...state,
                shiny: shinyXor === 0 ? 2 : 1,
                tid,
                sid,
                shinyXor,
                idAdvances: state.advances - 1,
                targetAdvances: state.advances,
              },
            ];
          },
        );
        resultCount += emeraldStates.length;
        options.onBatch?.(emeraldStates);
      },
    });
    return {
      ...summary,
      processedStates: Math.round(summary.processedStates * workScale),
      totalStates,
      resultCount,
    };
  }

  cancel() {
    this.generator.cancel();
  }

  dispose() {
    this.generator.dispose();
  }
}
