import { describe, expect, it } from "vitest";
import { gen6EventDefaultSettings, type Gen6EventRequest } from "../domain";
import { Gen6EventUiPreviewEngine } from "./Gen6EventUiPreviewEngine";

const request: Gen6EventRequest = {
  version: "omega-ruby",
  seed: 123,
  minFrame: 0,
  maxFrame: 2,
  tsv: 0,
  trv: 0,
  delay: 16,
  considerDelay: true,
  event: gen6EventDefaultSettings(25, 0),
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
  resultLimit: 100,
};

describe("Gen6EventUiPreviewEngine", () => {
  it("produces deterministic preview rows", async () => {
    const frames: number[] = [];
    await new Gen6EventUiPreviewEngine().search(request, {
      onBatch: (batch) => frames.push(...batch.map((row) => row.frame)),
    });
    expect(frames).toEqual([0, 1, 2]);
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new Gen6EventUiPreviewEngine().search(request, {
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ cancelled: true, processedStates: 0 });
  });
});
