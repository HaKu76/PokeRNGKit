import { describe, expect, it } from "vitest";
import { getGen3AbilityName } from "./gen3Abilities";
import { getGen3Personal } from "./gen3Personal";

describe("Generation III personal data", () => {
  it("keeps PokeFinder ability slots and localized names", () => {
    expect(getGen3Personal(328).abilities).toEqual([52, 71]);
    expect(getGen3AbilityName("en", 52)).toBe("Hyper Cutter");
    expect(getGen3AbilityName("zh", 71)).toBe("沙穴");
    expect(getGen3AbilityName("ja", 10)).toBe("ちくでん");
  });
});
