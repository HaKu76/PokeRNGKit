import { describe, expect, it } from "vitest";
import {
  encodeGen6StationaryGenderList,
  encodeGen6StationaryRequest,
  GEN6_STATIONARY_API_VERSION,
  GEN6_STATIONARY_MAX_FRAME,
  GEN6_STATIONARY_REQUEST_WORDS,
  gen6StationaryDefaultFilters,
  gen6StationaryHiddenPower,
  validateGen6StationaryRequest,
  type Gen6StationaryRequest,
} from "./domain";
import {
  GEN6_STATIONARY_TEMPLATES,
  gen6StationaryCategoriesForVersion,
  gen6StationaryTemplatesForVersion,
} from "./data";

const template = GEN6_STATIONARY_TEMPLATES.find(
  (entry) => entry.id === "oras-hoenn-legendary-008",
)!;
const request: Gen6StationaryRequest = {
  version: "omega-ruby",
  seed: 0x12345678,
  minFrame: 0,
  maxFrame: 100,
  delay: template.delay,
  considerDelay: true,
  tsv: 1234,
  trv: 5,
  shinyCharm: true,
  syncNature: null,
  assumeSync: false,
  template,
  bankTarget: 1,
  bankGenderList: "",
  filters: gen6StationaryDefaultFilters(),
  resultLimit: 1000,
};

describe("Gen VI Stationary domain", () => {
  it("packs the API v2 request and Transporter gender list", () => {
    expect(GEN6_STATIONARY_API_VERSION).toBe(2);
    expect(encodeGen6StationaryGenderList("2".repeat(20))).toBe(3486784400);
    const encoded = encodeGen6StationaryRequest({
      ...request,
      bankGenderList: "012",
    });
    expect(encoded).toHaveLength(GEN6_STATIONARY_REQUEST_WORDS);
    expect(encoded[3]).toBe(158);
    expect(encoded[9]).toBe(3);
    expect(encoded[48]).toBe(21);
  });

  it("uses the 3DSRNGTool hidden-power IV order", () => {
    expect(gen6StationaryHiddenPower([0, 0, 0, 1, 0, 0])).toBe(3);
    expect(gen6StationaryHiddenPower([1, 1, 1, 1, 1, 1])).toBe(15);
  });

  it("contains every generated PKM6 template with version filtering", () => {
    expect(GEN6_STATIONARY_TEMPLATES).toHaveLength(141);
    expect(gen6StationaryCategoriesForVersion("omega-ruby")).toContain(
      "Hoenn Legendary",
    );
    expect(
      gen6StationaryTemplatesForVersion("omega-ruby", "Hoenn Legendary"),
    ).toHaveLength(8);
    expect(
      GEN6_STATIONARY_TEMPLATES.every(
        (entry) => entry.ability >= 0 && entry.ability <= 3,
      ),
    ).toBe(true);
  });

  it("rejects browser and Bank input outside the verified range", () => {
    expect(GEN6_STATIONARY_MAX_FRAME).toBe(1_000_000_000);
    expect(() =>
      validateGen6StationaryRequest({ ...request, maxFrame: 5_000_001 }),
    ).toThrow(/5000000/);
    expect(() =>
      validateGen6StationaryRequest({
        ...request,
        bankGenderList: "0123",
      }),
    ).toThrow(/gender list/i);
    expect(() =>
      validateGen6StationaryRequest({ ...request, bankTarget: 2 }),
    ).toThrow(/Bank target/);
  });
});
