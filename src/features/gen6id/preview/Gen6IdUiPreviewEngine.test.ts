import { describe, expect, it } from "vitest";
import type { Gen6IdRequest } from "../domain";
import { Gen6IdUiPreviewEngine } from "./Gen6IdUiPreviewEngine";

const request: Gen6IdRequest = {
  state: [1, 2, 3, 4],
  minFrame: 10,
  maxFrame: 19,
  resultLimit: 100,
  filters: {
    mode: "tid",
    disabled: true,
    regularExpression: false,
    idText: "",
    tsvText: "",
    stateText: "",
  },
};

describe("Gen VI ID UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const rows: number[] = [];
    const summary = await new Gen6IdUiPreviewEngine().search(request, {
      onBatch: (batch) => rows.push(...batch.map((entry) => entry.frame)),
    });
    expect(rows).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(summary).toMatchObject({
      processedStates: 10,
      resultCount: 10,
      cancelled: false,
    });
  });
});
