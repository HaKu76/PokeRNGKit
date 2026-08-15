import { describe, expect, it } from "vitest";
import type {
  Gen7EggListRequest,
  Gen7EggResult,
  Gen7EggShortestPathRequest,
} from "../domain";
import { GEN7_EGG_TEST_REQUEST } from "../testFixtures";
import { Gen7EggUiPreviewEngine } from "./Gen7EggUiPreviewEngine";

describe("Gen7EggUiPreviewEngine", () => {
  it("emits deterministic Egg rows", async () => {
    const results: Gen7EggResult[] = [];
    const summary = await new Gen7EggUiPreviewEngine().search(
      GEN7_EGG_TEST_REQUEST,
      { onBatch: (batch) => results.push(...batch) },
    );
    expect(results).toHaveLength(3);
    expect(results[0]).toMatchObject({ frame: 0, eggNumber: 0 });
    expect(summary).toMatchObject({
      cancelled: false,
      processedStates: 3,
      totalStates: 3,
    });
  });

  it("honors pre-aborted searches", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new Gen7EggUiPreviewEngine().search(GEN7_EGG_TEST_REQUEST, {
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ cancelled: true, processedStates: 0 });
  });

  it("summarizes Egg Number and Shortest Path modes", async () => {
    const listRequest: Gen7EggListRequest = {
      ...GEN7_EGG_TEST_REQUEST,
      mode: "egg-list",
      minEgg: 2,
      maxEgg: 4,
      targetFrame: 50,
      shinyReminder: false,
    };
    const listResults: Gen7EggResult[] = [];
    const listSummary = await new Gen7EggUiPreviewEngine().search(listRequest, {
      onBatch: (batch) => listResults.push(...batch),
    });
    expect(listResults.map((result) => result.eggNumber)).toEqual([2, 3, 4]);
    expect(listSummary).toMatchObject({
      cancelled: false,
      processedStates: 4,
      totalStates: 4,
      targetFound: true,
    });

    const pathRequest: Gen7EggShortestPathRequest = {
      ...GEN7_EGG_TEST_REQUEST,
      mode: "shortest-path",
      targetFrame: 50,
      shinyReminder: false,
    };
    const pathResults: Gen7EggResult[] = [];
    const pathSummary = await new Gen7EggUiPreviewEngine().search(pathRequest, {
      onBatch: (batch) => pathResults.push(...batch),
    });
    expect(pathResults[0].frame).toBe(0);
    expect(pathResults.at(-1)?.frame).toBe(50);
    expect(pathSummary.acceptedEggs + pathSummary.rejectedEggs).toBe(
      pathResults.length - 1,
    );
  });

  it("cancels while preparing a Shortest Path", async () => {
    const engine = new Gen7EggUiPreviewEngine();
    const request: Gen7EggShortestPathRequest = {
      ...GEN7_EGG_TEST_REQUEST,
      mode: "shortest-path",
      targetFrame: 4_999,
      shinyReminder: false,
    };
    const completion = engine.search(request);
    setTimeout(() => engine.cancel(), 0);
    await expect(completion).resolves.toMatchObject({
      cancelled: true,
      targetFound: false,
    });
  });
});
