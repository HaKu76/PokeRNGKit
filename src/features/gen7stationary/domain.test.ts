import { describe, expect, it } from "vitest";
import { GEN7_STATIONARY_TEMPLATES } from "./data";
import {
  decodeGen7StationaryResults,
  encodeGen7StationaryRequest,
  GEN7_STATIONARY_REQUEST_WORDS,
  gen7StationaryEncounterFromTemplate,
  gen7StationaryHiddenPower,
  gen7StationaryStartingFrame,
  validateGen7StationaryRequest,
  type Gen7StationaryRequest,
} from "./domain";

const template = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "sm" && entry.conceptual,
)!;

const request: Gen7StationaryRequest = {
  version: "sun",
  seed: 0x1234_5678,
  minFrame: 418,
  maxFrame: 518,
  tsv: 1234,
  trv: 8,
  shinyCharm: true,
  forcedShiny: false,
  syncNature: 3,
  considerDelay: true,
  pelagoShift: 0,
  encounter: gen7StationaryEncounterFromTemplate(template),
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
  },
  resultLimit: 100_000,
};

describe("Gen 7 Stationary domain", () => {
  it("uses the upstream starting frames and generated encounter inventory", () => {
    expect(gen7StationaryStartingFrame("sun")).toBe(418);
    expect(gen7StationaryStartingFrame("moon")).toBe(418);
    expect(gen7StationaryStartingFrame("ultra-sun")).toBe(478);
    expect(gen7StationaryStartingFrame("ultra-moon")).toBe(478);
    expect(GEN7_STATIONARY_TEMPLATES).toHaveLength(228);
    expect(
      GEN7_STATIONARY_TEMPLATES.every((entry) =>
        entry.versions.every((version) =>
          entry.family === "sm"
            ? version === "sun" || version === "moon"
            : version === "ultra-sun" || version === "ultra-moon",
        ),
      ),
    ).toBe(true);
  });

  it("packs the complete session request ABI", () => {
    expect(encodeGen7StationaryRequest(request)).toHaveLength(
      GEN7_STATIONARY_REQUEST_WORDS,
    );
  });

  it("keeps fixed-3V and in-game trade template invariants", () => {
    const fixedThreeIvTemplates = GEN7_STATIONARY_TEMPLATES.filter(
      (entry) => entry.fixedThreeIv,
    );
    expect(fixedThreeIvTemplates.length).toBeGreaterThan(0);
    expect(
      fixedThreeIvTemplates.every(
        (entry) => entry.ivs.filter((value) => value === -1).length >= 3,
      ),
    ).toBe(true);

    const tradeTemplates = GEN7_STATIONARY_TEMPLATES.filter(
      (entry) => entry.trade,
    );
    expect(tradeTemplates.length).toBeGreaterThan(0);
    expect(
      tradeTemplates.every(
        (entry) =>
          entry.nature < 25 &&
          entry.ability !== 0 &&
          !entry.randomGender &&
          [0, 1, 2].includes(entry.genderSetting),
      ),
    ).toBe(true);
  });

  it("only permits forced shiny for Ultra Space Wilds", () => {
    expect(() =>
      validateGen7StationaryRequest({ ...request, forcedShiny: true }),
    ).toThrow(/Ultra Space Wilds/);
  });

  it("decodes the compact C ABI result record", () => {
    const ivs = [31, 30, 29, 28, 27, 26] as const;
    const packedIvs = ivs.reduce(
      (word, value, index) => word | (value << (index * 5)),
      0,
    );
    const hiddenPower = gen7StationaryHiddenPower([...ivs]);
    const metadata =
      3 |
      (2 << 5) |
      (1 << 7) |
      (hiddenPower << 9) |
      (1 << 13) |
      (1 << 15) |
      (5 << 16);
    const words = new Uint32Array([
      418,
      60,
      0x89ab_cdef,
      0x0123_4567,
      0x7654_3210,
      0x1234_5678,
      packedIvs,
      metadata,
      22,
    ]);
    expect(decodeGen7StationaryResults(words.buffer)[0]).toMatchObject({
      frame: 418,
      realTimeFrames: 60,
      random: 0x0123_4567_89ab_cdefn,
      ec: 0x7654_3210,
      pid: 0x1234_5678,
      ivs: [...ivs],
      nature: 3,
      ability: 2,
      gender: 1,
      hiddenPower,
      shiny: 1,
      synchronize: true,
      blink: 5,
      delay: 22,
    });
  });
});
