import { describe, expect, it } from "vitest";
import {
  gen6WildDefaultFilters,
  gen6WildSlots,
  gen6WildAreas,
  type Gen6WildRequest,
} from "../domain";
import { Gen6WildUiPreviewEngine } from "./Gen6WildUiPreviewEngine";

function request(): Gen6WildRequest {
  const slots = gen6WildSlots(
    gen6WildAreas("omega-ruby", "normal")[0],
    "normal",
  );
  return {
    version: "omega-ruby",
    encounterType: "normal",
    seed: 1,
    minFrame: 0,
    maxFrame: 10,
    delay: 0,
    considerDelay: true,
    tsv: 0,
    trv: 0,
    shinyCharm: false,
    syncNature: null,
    lead: "none",
    tinySeed: 2,
    tinyFrame: 0,
    tinySynced: false,
    encounterRate: 100,
    partyPokemon: 0,
    pidRolls: 1,
    compoundEyes: false,
    hiddenAbility: false,
    flute: 0,
    hordeSlot: 1,
    slots,
    slotDistribution: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1],
    filters: { ...gen6WildDefaultFilters(), disabled: true },
    resultLimit: 20,
  };
}

describe("Gen VI Wild preview engine", () => {
  it("emits deterministic rows and progress", async () => {
    const engine = new Gen6WildUiPreviewEngine();
    const batches: number[] = [];
    const summary = await engine.search(request(), {
      onBatch: (batch) => batches.push(batch.length),
    });
    expect(summary.processedStates).toBe(11);
    expect(summary.resultCount).toBeGreaterThan(0);
    expect(batches).toHaveLength(1);
    engine.dispose();
  });
});
