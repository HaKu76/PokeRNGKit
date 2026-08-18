import { describe, expect, it } from "vitest";
import {
  decodeGen6PokeRadarResults,
  encodeGen6PokeRadarRequest,
  gen6PokeRadarOverview,
  validateGen6PokeRadarRequest,
  type Gen6PokeRadarRequest,
} from "./domain";
const request: Gen6PokeRadarRequest = {
  tinySeed: 0x12345678,
  minFrame: 0,
  maxFrame: 31,
  tinyFrame: 0,
  partySize: 6,
  chainLength: 40,
  boost: true,
  resultLimit: 100,
};
describe("Gen VI Poke Radar domain", () => {
  it("encodes the eight-word request", () =>
    expect([...encodeGen6PokeRadarRequest(request)]).toEqual([
      0x12345678, 0, 32, 0, 6, 40, 1, 100,
    ]));
  it("decodes patches and overview", () => {
    const words = new Uint32Array(16);
    words[1] = 50 | (2 << 8) | (1 << 16) | (1 << 17);
    words[2] = 2 | (1 << 4) | (3 << 8) | (2 << 12) | (4 << 16) | (5 << 20);
    const [result] = decodeGen6PokeRadarResults(words.buffer);
    expect(result).toMatchObject({
      music: 50,
      musicType: "M",
      boost: true,
      shiny: true,
    });
    expect(result.patches[0]).toMatchObject({
      ring: 2,
      state: "shiny",
      x: 4,
      y: 5,
    });
    expect(gen6PokeRadarOverview(result)[4][4]).toBe("C");
  });
  it("rejects party sizes over six", () =>
    expect(() =>
      validateGen6PokeRadarRequest({ ...request, partySize: 7 }),
    ).toThrow(/settings/));
});
