import { describe, expect, it } from "vitest";
import {
  encodeGen6BankRequest,
  validateGen6BankRequest,
  type Gen6BankRequest,
} from "./domain";
import {
  gen6StationaryDefaultFilters,
  gen6StationaryProfile,
} from "../gen6stationary/domain";
import { gen6StationaryTemplatesForVersion } from "../gen6stationary/data";

function bankRequest(): Gen6BankRequest {
  const template = gen6StationaryTemplatesForVersion(
    "transporter",
    "Poke Transporter",
    true,
  )[1];
  if (!template) throw new Error("Transporter test template is missing.");
  return {
    version: "transporter" as const,
    seed: 0x12345678,
    minFrame: 0,
    maxFrame: 10,
    delay: 16,
    considerDelay: true,
    tsv: 0,
    trv: 0,
    shinyCharm: false,
    syncNature: null,
    assumeSync: false,
    template,
    bankTarget: 1,
    bankGenderList: "2",
    filters: gen6StationaryDefaultFilters(),
    resultLimit: 100,
  };
}

describe("Gen VI Bank domain", () => {
  it("exposes only Bank templates and packs the shared ABI", () => {
    const request = bankRequest();
    expect(request.template.bank).toBe(true);
    expect(validateGen6BankRequest(request)).toBe(request);
    expect(encodeGen6BankRequest(request)).toHaveLength(49);
  });

  it("rejects a normal stationary template", () => {
    const request = bankRequest();
    request.template = {
      ...request.template,
      bank: false,
    };
    expect(() => validateGen6BankRequest(request)).toThrow(/Bank targets/);
  });

  it("keeps Gen VI profile fallback local", () => {
    expect(gen6StationaryProfile(undefined).version).toBe("omega-ruby");
  });
});
