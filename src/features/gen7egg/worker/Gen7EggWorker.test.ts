import { describe, expect, it } from "vitest";
import { encodeGen7EggRequest, GEN7_EGG_REQUEST_WORDS } from "../domain";
import { GEN7_EGG_TEST_REQUEST } from "../testFixtures";

describe("Gen 7 Egg Worker protocol", () => {
  it("keeps the request word count aligned with the Wasm ABI", () => {
    expect(encodeGen7EggRequest(GEN7_EGG_TEST_REQUEST)).toHaveLength(
      GEN7_EGG_REQUEST_WORDS,
    );
  });
});
