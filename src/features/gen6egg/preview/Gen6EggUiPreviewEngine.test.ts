import { describe, expect, it } from "vitest";
import { Gen6EggUiPreviewEngine } from "./Gen6EggUiPreviewEngine";
import type { Gen6EggRequest } from "../domain";

const request: Gen6EggRequest = {
  mainSeed: 0x12345678,
  minFrame: 0,
  maxFrame: 9,
  key0: 1,
  key1: 2,
  tsv: 0,
  trv: 0,
  genderRatio: "one-to-one",
  maleIvs: [31, 31, 31, 31, 31, 31],
  femaleIvs: [0, 0, 0, 0, 0, 0],
  maleAbility: 0,
  femaleAbility: 0,
  maleDitto: false,
  femaleDitto: false,
  maleItem: "none",
  femaleItem: "none",
  nidoType: false,
  shinyCharm: false,
  masudaMethod: false,
  considerOtherTsv: false,
  acceptEgg: true,
  otherTsvs: [],
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureInheritance: "any",
  },
  resultLimit: 100,
};

describe("Gen VI Egg UI preview", () => {
  it("returns deterministic rows and progress", async () => {
    const rows: number[] = [];
    const summary = await new Gen6EggUiPreviewEngine().search(request, {
      onBatch: (batch) => rows.push(...batch.map((entry) => entry.frame)),
    });
    expect(rows).toEqual([-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(summary).toMatchObject({
      processedStates: 10,
      resultCount: 11,
      cancelled: false,
    });
  });
});
