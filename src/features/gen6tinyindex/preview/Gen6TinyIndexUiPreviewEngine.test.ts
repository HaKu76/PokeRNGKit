import { describe, expect, it } from "vitest";
import type { Gen6TinyIndexRequest } from "../domain";
import { Gen6TinyIndexUiPreviewEngine } from "./Gen6TinyIndexUiPreviewEngine";

const request: Gen6TinyIndexRequest = {
  mode: "generator",
  state: [1, 2, 3, 4],
  baseSeed: 0,
  minIndex: 10,
  maxIndex: 19,
  year: 2000,
  month: 1,
  startSecond: 0,
  secondCount: 1,
  resultLimit: 100,
  filters: {
    disabled: true,
    regularExpression: false,
    indexText: "",
    stateText: "",
  },
};

describe("Gen VI TinyMT Index UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const rows: number[] = [];
    const summary = await new Gen6TinyIndexUiPreviewEngine().search(request, {
      onBatch: (batch) => rows.push(...batch.map((entry) => entry.index)),
    });
    expect(rows).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(summary).toMatchObject({
      processedStates: 10,
      resultCount: 10,
      cancelled: false,
    });
  });
});
