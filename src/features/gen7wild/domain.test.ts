import { describe, expect, it } from "vitest";
import {
  GEN7_WILD_AREAS,
  GEN7_WILD_SLOT_DISTRIBUTIONS,
  GEN7_WILD_SPECIALS,
} from "./data";
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
    expect(GEN7_WILD_SLOT_DISTRIBUTIONS).toHaveLength(56);
    expect(GEN7_WILD_SLOT_DISTRIBUTIONS[0]).toEqual([
      20, 20, 10, 10, 10, 10, 10, 5, 4, 1,
    ]);
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

  it("aligns every generated encounter with its upstream slot distribution", () => {
    const invalidAreas = GEN7_WILD_AREAS.filter((candidate) => {
      const distributions = [
        GEN7_WILD_SLOT_DISTRIBUTIONS[candidate.slotType],
        ...(candidate.category === "fishing"
          ? [GEN7_WILD_SLOT_DISTRIBUTIONS[candidate.slotType + 1]]
          : []),
      ];
      return distributions.some(
        (distribution) =>
          !distribution ||
          distribution.reduce((sum, chance) => sum + chance, 0) !== 100 ||
          Object.values(candidate.variants).some(
            (slots) => slots.length !== distribution.length,
          ),
      );
    });

    expect(invalidAreas.map((candidate) => candidate.id)).toEqual([]);
  });

  it("keeps the fishing-only Pokemon delay within the upstream range", () => {
    expect(request.encounter).toMatchObject({
      delayTime: 6,
      pokemonDelay: 1,
    });

    const fishingAreas = gen7WildAreas("ultra-sun", "fishing");
    const standardArea = fishingAreas.find(
      (candidate) => "lapras" in candidate && !candidate.lapras,
    );
    const laprasArea = fishingAreas.find(
      (candidate) => "lapras" in candidate && candidate.lapras,
    );
    if (!standardArea || !laprasArea) {
      throw new Error("Expected both standard and Lapras fishing areas.");
    }

    const encounterOptions = {
      version: "ultra-sun" as const,
      category: "fishing" as const,
      night: false,
      bubbling: false,
      fishingOverview: false,
      trigger: "default" as const,
    };
    expect(
      gen7WildEncounterFromArea({
        ...encounterOptions,
        area: standardArea,
      }),
    ).toMatchObject({ delayTime: 1, pokemonDelay: 1 });
    expect(
      gen7WildEncounterFromArea({
        ...encounterOptions,
        area: laprasArea,
      }),
    ).toMatchObject({ delayTime: 2, pokemonDelay: 2 });
  });
});
