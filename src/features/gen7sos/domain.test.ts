import { describe, expect, it } from "vitest";
import {
  encodeGen7SosRequest,
  GEN7_SOS_REQUEST_WORDS,
  gen7SosAreas,
  gen7SosCallers,
  gen7SosSlots,
  type Gen7SosPokemonRequest,
} from "./domain";

const area = gen7SosAreas("ultra-sun")[0];
const caller = gen7SosCallers(area, "ultra-sun", false)[0];
const request: Gen7SosPokemonRequest = {
  mode: "pokemon",
  version: "ultra-sun",
  seed: 0x1234_5678,
  minFrame: 478,
  maxFrame: 578,
  tsv: 1234,
  trv: 8,
  shinyCharm: true,
  syncNature: 3,
  lead: "synchronize",
  npc: area.npc,
  considerDelay: true,
  delayTime: 6,
  sosSeed: 0x8765_4321,
  sosFrame: 0,
  chainLength: 30,
  levelMin: area.levelMin,
  levelMax: area.levelMax,
  weather: "none",
  slots: gen7SosSlots({
    area,
    caller,
    version: "ultra-sun",
    night: false,
    weather: "none",
  }),
  callConditions: {
    callRate: 9,
    hpBonus: 5,
    adrenalineOrb: true,
    intimidate: false,
    lastCallSucceeded: false,
    lastCallFailed: false,
    superEffective: false,
  },
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
    level: 0,
  },
  resultLimit: 100_000,
};

describe("Gen 7 SOS domain", () => {
  it("resolves the nine regular and weather SOS slots", () => {
    expect(request.slots).toHaveLength(9);
    expect(request.slots.slice(0, 7).every((slot) => slot.species > 0)).toBe(
      true,
    );
  });

  it("packs the complete SOS request ABI", () => {
    expect(encodeGen7SosRequest(request)).toHaveLength(GEN7_SOS_REQUEST_WORDS);
  });
});
