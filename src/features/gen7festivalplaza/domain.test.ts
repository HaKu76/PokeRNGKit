import { describe, expect, it } from "vitest";
import {
  decodeGen7FestivalPlazaResults,
  encodeGen7FestivalPlazaRequest,
  formatGen7FestivalPlazaBlinkMark,
  GEN7_FESTIVAL_PLAZA_REQUEST_WORDS,
  gen7FestivalPlazaFacilityPool,
  gen7FestivalPlazaResultWords,
  validateGen7FestivalPlazaRequest,
  validateGen7FestivalPlazaResult,
  type Gen7FestivalPlazaRequest,
} from "./domain";

const request: Gen7FestivalPlazaRequest = {
  seed: 0x1234_5678,
  minFrame: 0,
  maxFrame: 100,
  version: "moon",
  npc: 1,
  delay: 20,
  rank: 18,
  starFilter: 4,
  facilityFilter: -1,
  npcTypeFilter: -1,
  colorFilter: -1,
  includeNpcStatus: true,
  resultLimit: 100_000,
};

describe("Gen 7 Festival Plaza domain", () => {
  it("packs optional filters and decodes signed NPC status rows", () => {
    const encoded = encodeGen7FestivalPlazaRequest(request);
    expect(encoded).toHaveLength(GEN7_FESTIVAL_PLAZA_REQUEST_WORDS);
    expect(encoded[8]).toBe(0xffff_ffff);
    expect(encoded[9]).toBe(0xffff_ffff);
    expect(encoded[10]).toBe(0xffff_ffff);
    expect(gen7FestivalPlazaResultWords(request)).toBe(12);

    const result = decodeGen7FestivalPlazaResults(
      request,
      new Uint32Array([
        0, 20, 0, 0x89ab_cdef, 0x0123_4567, 4, 11, 5, 2, 1, 0xffff_ffff, 36,
      ]).buffer,
    )[0];
    expect(result).toEqual({
      frame: 0,
      actualFrame: 20,
      realTimeFrames: 0,
      random: 0x0123_4567_89ab_cdefn,
      star: 4,
      facility: 11,
      npcType: 5,
      color: 2,
      blink: 1,
      clock: Number(0x0123_4567_89ab_cdefn % 17n),
      npcStatus: [-1, 36],
    });
    expect(() =>
      validateGen7FestivalPlazaResult(request, result),
    ).not.toThrow();
  });

  it("uses dynamic Moon pools and gates Switcheroo to Ultra games", () => {
    expect(gen7FestivalPlazaFacilityPool("sun", 4)).toEqual([
      3, 4, 5, 7, 14, 16, 17,
    ]);
    expect(gen7FestivalPlazaFacilityPool("moon", 4)).toEqual([
      0, 1, 2, 11, 13, 15,
    ]);
    expect(gen7FestivalPlazaFacilityPool("sun", 1)).not.toContain(33);
    expect(gen7FestivalPlazaFacilityPool("ultra-sun", 1)).toContain(33);
  });

  it("formats blink marks like the upstream result model", () => {
    expect(
      [0, 1, 2, 3, 4, 5, 36].map(formatGen7FestivalPlazaBlinkMark),
    ).toEqual(["-", "★", "?", "? ★", "E", "5", "36"]);
  });

  it("enforces upstream limits and cross-field facility availability", () => {
    expect(() =>
      validateGen7FestivalPlazaRequest({ ...request, delay: 10_001 }),
    ).toThrow(/Delay/);
    expect(() =>
      validateGen7FestivalPlazaRequest({ ...request, rank: 19 }),
    ).toThrow(/Rank/);
    expect(() =>
      validateGen7FestivalPlazaRequest({
        ...request,
        version: "sun",
        facilityFilter: 11,
      }),
    ).toThrow(/Facility/);
    expect(() =>
      validateGen7FestivalPlazaRequest({
        ...request,
        maxFrame: 5_000_001,
      }),
    ).toThrow(/Maximum frame/);
  });
});
