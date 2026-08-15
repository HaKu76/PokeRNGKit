import { describe, expect, it } from "vitest";
import { encodeGen7WildRequest, GEN7_WILD_REQUEST_WORDS } from "../domain";
import { gen7WildAreas, gen7WildEncounterFromArea } from "../domain";

describe("Gen 7 Wild Worker protocol", () => {
  it("keeps the request word count aligned with the Wasm ABI", () => {
    const area = gen7WildAreas("sun", "berry")[0];
    const packed = encodeGen7WildRequest({
      version: "sun",
      seed: 0,
      minFrame: 418,
      maxFrame: 418,
      tsv: 0,
      trv: 0,
      shinyCharm: false,
      syncNature: null,
      lead: "none",
      considerDelay: true,
      encounter: gen7WildEncounterFromArea({
        version: "sun",
        category: "berry",
        area,
        night: false,
        bubbling: false,
        fishingOverview: false,
        trigger: "default",
      }),
      filters: {
        disabled: true,
        shiny: "any",
        gender: "any",
        ability: "any",
        natureMask: 0,
        hiddenPowerMask: 0,
        ivMin: [0, 0, 0, 0, 0, 0],
        ivMax: [31, 31, 31, 31, 31, 31],
        perfectIvValue: 31,
        perfectIvCount: 0,
        blink: "any",
        slotMask: 0,
        specialOnly: false,
        level: 0,
      },
      resultLimit: 1,
    });
    expect(packed).toHaveLength(GEN7_WILD_REQUEST_WORDS);
  });
});
