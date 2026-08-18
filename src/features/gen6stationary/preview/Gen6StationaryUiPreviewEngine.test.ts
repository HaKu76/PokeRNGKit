import { describe, expect, it } from "vitest";
import {
  gen6StationaryDefaultFilters,
  type Gen6StationaryRequest,
} from "../domain";
import { GEN6_STATIONARY_TEMPLATES } from "../data";
import { Gen6StationaryUiPreviewEngine } from "./Gen6StationaryUiPreviewEngine";

const request: Gen6StationaryRequest = {
  version: "omega-ruby",
  seed: 123,
  minFrame: 0,
  maxFrame: 2,
  delay: 16,
  considerDelay: true,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  syncNature: null,
  assumeSync: false,
  template: GEN6_STATIONARY_TEMPLATES.find(
    (template) => template.id === "oras-hoenn-legendary-008",
  )!,
  bankTarget: 1,
  bankGenderList: "",
  filters: { ...gen6StationaryDefaultFilters(), disabled: true },
  resultLimit: 100,
};

describe("Gen6StationaryUiPreviewEngine", () => {
  it("produces deterministic preview rows", async () => {
    const results: number[] = [];
    await new Gen6StationaryUiPreviewEngine().search(request, {
      onBatch: (batch) => results.push(...batch.map((row) => row.frame)),
    });
    expect(results).toEqual([0, 1, 2]);
  });
  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new Gen6StationaryUiPreviewEngine().search(request, {
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ cancelled: true, processedStates: 0 });
  });
});
