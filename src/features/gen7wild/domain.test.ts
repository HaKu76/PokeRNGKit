import { describe, expect, it } from "vitest";
import { GEN7_WILD_AREAS, GEN7_WILD_SPECIALS } from "./data";
import {
  encodeGen7WildRequest,
  GEN7_WILD_REQUEST_WORDS,
  gen7WildAreas,
  gen7WildEncounterFromArea,
  gen7WildStartingFrame,
  type Gen7WildRequest,
} from "./domain";

const area = gen7WildAreas("ultra-sun", "normal")[0];
const request: Gen7WildRequest = {
  version: "ultra-sun",
  seed: 0x1234_5678,
  minFrame: 478,
  maxFrame: 1478,
  tsv: 1234,
  trv: 8,
  shinyCharm: true,
  syncNature: 3,
  lead: "synchronize",
  considerDelay: true,
  encounter: gen7WildEncounterFromArea({
    version: "ultra-sun",
    category: "normal",
    area,
    night: false,
    bubbling: false,
    fishingOverview: false,
    trigger: "default",
  }),
  filters: {
    disabled: false,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
    slotMask: 0,
    specialOnly: false,
    level: 0,
  },
  resultLimit: 100_000,
};

describe("Gen 7 Wild domain", () => {
  it("keeps the upstream starting frames and encounter inventory", () => {
    expect(gen7WildStartingFrame("sun")).toBe(418);
    expect(gen7WildStartingFrame("ultra-moon")).toBe(478);
    expect(GEN7_WILD_AREAS.length).toBe(281);
    expect(GEN7_WILD_SPECIALS.length).toBe(66);
  });

  it("packs the complete Wild request ABI", () => {
    expect(encodeGen7WildRequest(request)).toHaveLength(
      GEN7_WILD_REQUEST_WORDS,
    );
  });

  it("resolves ten normal encounter slots from the upstream slot map", () => {
    expect(request.encounter.slots).toHaveLength(10);
  });
});
