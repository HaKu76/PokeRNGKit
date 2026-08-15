import { describe, expect, it } from "vitest";
import {
  decodeGen7EggResults,
  encodeGen7EggRequest,
  getGen7EggResultStateUpdate,
  GEN7_EGG_MAX_FRAME,
  GEN7_EGG_MAX_SHORTEST_PATH_FRAME,
  GEN7_EGG_REQUEST_WORDS,
  GEN7_EGG_RESULT_WORDS,
  parseGen7EggTsvList,
  validateGen7EggExecutionRequest,
  validateGen7EggRequest,
  type Gen7EggShortestPathRequest,
} from "./domain";
import { GEN7_EGG_TEST_REQUEST } from "./testFixtures";

describe("Gen 7 Egg domain", () => {
  it("packs the complete Egg request ABI", () => {
    expect(encodeGen7EggRequest(GEN7_EGG_TEST_REQUEST)).toHaveLength(
      GEN7_EGG_REQUEST_WORDS,
    );
  });

  it("decodes the fixed-width Egg result ABI", () => {
    const words = new Uint32Array(GEN7_EGG_RESULT_WORDS);
    words[13] =
      31 | (30 << 5) | (29 << 10) | (28 << 15) | (27 << 20) | (26 << 25);
    words[14] =
      3 | (2 << 5) | (1 << 7) | (15 << 9) | (1 << 13) | (2 << 15) | (1 << 17);
    words[15] = 20;
    words[18] = 1234;
    words[19] = 8;
    expect(decodeGen7EggResults(words.buffer)[0]).toMatchObject({
      ivs: [31, 30, 29, 28, 27, 26],
      nature: 3,
      ability: 2,
      gender: 1,
      hiddenPower: 15,
      shiny: true,
      ball: "female",
      natureParent: "male",
      framesUsed: 20,
      psv: 1234,
      prv: 8,
    });
  });

  it("enforces the upstream gender and Ditto combinations", () => {
    expect(() =>
      validateGen7EggRequest({
        ...GEN7_EGG_TEST_REQUEST,
        genderRatio: "genderless",
        homogeneous: false,
      }),
    ).toThrow(/female parent to be Ditto/i);

    expect(() =>
      validateGen7EggRequest({
        ...GEN7_EGG_TEST_REQUEST,
        genderRatio: "female-only",
        homogeneous: false,
        female: { ...GEN7_EGG_TEST_REQUEST.female, ditto: true },
      }),
    ).toThrow(/female parent/i);

    expect(
      validateGen7EggRequest({
        ...GEN7_EGG_TEST_REQUEST,
        genderRatio: "male-only",
        homogeneous: false,
        female: { ...GEN7_EGG_TEST_REQUEST.female, ditto: true },
      }),
    ).toBeDefined();
  });

  it("keeps the upstream frame limit while protecting browser path memory", () => {
    const request: Gen7EggShortestPathRequest = {
      ...GEN7_EGG_TEST_REQUEST,
      mode: "shortest-path",
      targetFrame: GEN7_EGG_MAX_FRAME,
      shinyReminder: false,
    };
    expect(validateGen7EggRequest(request)).toBe(request);
    expect(() => validateGen7EggExecutionRequest(request)).toThrow(
      String(GEN7_EGG_MAX_SHORTEST_PATH_FRAME),
    );
  });

  it("matches the TSV editor and result state actions", () => {
    expect(parseGen7EggTsvList("1, 2048 invalid 4096 0042")).toEqual([
      1, 2048, 42,
    ]);
    const words = new Uint32Array(GEN7_EGG_RESULT_WORDS);
    words[0] = 10;
    words[2] = 1;
    words[6] = 2;
    words[15] = 20;
    const result = decodeGen7EggResults(words.buffer)[0];
    expect(getGen7EggResultStateUpdate(result, 100, false)).toEqual({
      state: [1, 0, 0, 0],
      targetFrame: 90,
    });
    expect(getGen7EggResultStateUpdate(result, 100, true)).toEqual({
      state: [2, 0, 0, 0],
      targetFrame: 70,
    });
    expect(getGen7EggResultStateUpdate(result, 20, true).targetFrame).toBe(20);
  });
});
