import { describe, expect, it } from "vitest";
import { GAMECUBE_TEMPLATES } from "./encounters";
import {
  createGameCubeChunks,
  gameCubeSearcherCombinationCount,
  validateGameCubeRequest,
  type GameCubeChunk,
  type GameCubeRequest,
} from "./domain";

const request: GameCubeRequest = {
  operation: "searcher",
  category: "non-shadow",
  version: "xd",
  template: GAMECUBE_TEMPLATES["non-shadow"][0],
  seed: 0,
  initialAdvances: 0,
  maxAdvances: 0,
  offset: 0,
  firstShadowUnset: false,
  tid: 0,
  sid: 0,
  filters: {
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
  },
};

function rangesOverlap(first: GameCubeChunk, second: GameCubeChunk) {
  return first.ivMin.every(
    (minimum, index) =>
      minimum <= second.ivMax[index] &&
      second.ivMin[index] <= first.ivMax[index],
  );
}

describe("Gen3 GameCube domain", () => {
  it("applies perfect IV filtering after the six IV ranges", () => {
    const perfectRequest: GameCubeRequest = {
      ...request,
      filters: {
        ...request.filters,
        perfectIvValue: 31,
        perfectIvCount: 5,
      },
    };
    const chunks = createGameCubeChunks(perfectRequest, 200);

    expect(gameCubeSearcherCombinationCount(perfectRequest)).toBe(187);
    expect(validateGameCubeRequest(perfectRequest)).not.toContain(
      "searchRange",
    );
    expect(chunks.reduce((total, chunk) => total + chunk.stateCount, 0)).toBe(
      187,
    );
    expect(chunks).toHaveLength(7);
    for (let first = 0; first < chunks.length; first++)
      for (let second = first + 1; second < chunks.length; second++)
        expect(rangesOverlap(chunks[first], chunks[second])).toBe(false);
  });

  it("keeps the full IV range when the perfect IV count is disabled", () => {
    const unfilteredRequest: GameCubeRequest = {
      ...request,
      filters: {
        ...request.filters,
        ivMax: [4, 4, 4, 4, 4, 4],
      },
    };

    expect(gameCubeSearcherCombinationCount(unfilteredRequest)).toBe(15_625);
    expect(createGameCubeChunks(unfilteredRequest, 20_000)).toEqual([
      expect.objectContaining({
        ivMin: [0, 0, 0, 0, 0, 0],
        ivMax: [4, 4, 4, 4, 4, 4],
        stateCount: 15_625,
      }),
    ]);
  });
});
