import { describe, expect, it } from "vitest";
import {
  decodeGen5EventResults,
  encodeGen5EventRequest,
  gen5EventEvaluationCount,
  gen5EventSearcherSeedCount,
  splitGen5EventRequest,
  validateGen5EventRequest,
  type Gen5EventGeneratorRequest,
  type Gen5EventSearcherRequest,
} from "./domain";

const generator: Gen5EventGeneratorRequest = {
  mode: "generator",
  profile: {
    version: "black2",
    language: "english",
    dsType: "ds",
    tid: 12345,
    sid: 54321,
    mac: "001122334455",
    vcount: 0x82,
    timer0Min: 0x1100,
    timer0Max: 0x1100,
    gxstat: 6,
    vframe: 8,
    keypresses: [true, false, false, false, false, false, false, false, false],
    skipLR: false,
    memoryLink: true,
  },
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 9,
  offset: 0,
  event: {
    tid: 3013,
    sid: 0,
    species: 648,
    nature: 255,
    gender: 2,
    ability: 0,
    shiny: 1,
    level: 50,
    egg: false,
    ivs: [null, 31, null, null, null, null],
  },
  filters: {
    disabled: false,
    ability: 255,
    gender: 255,
    shiny: 255,
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100_000,
};

describe("Gen 5 Event domain", () => {
  it("packs the fixed 64-word ABI in bridge field order", () => {
    const words = encodeGen5EventRequest(generator, {
      index: 0,
      start: 2,
      count: 4,
    });
    expect(words).toHaveLength(64);
    expect([...words.slice(0, 8)]).toEqual([
      0, 2, 0, 0, 12345, 54321, 0x22334455, 0x11,
    ]);
    expect(words[22]).toBe(255);
    expect(words[28]).toBe(1 << 1);
    expect(words[30]).toBe(31);
    expect([...words.slice(60)]).toEqual([0, 0, 2, 4]);
  });

  it("counts Searcher date, Timer0, keypress, and second units", () => {
    const searcher: Gen5EventSearcherRequest = {
      ...generator,
      mode: "searcher",
      startDate: "2026-08-14",
      endDate: "2026-08-15",
      maxAdvances: 0,
    };
    expect(gen5EventSearcherSeedCount(searcher)).toBe(172_800n);
    expect(gen5EventEvaluationCount(searcher)).toBe(172_800n);
  });

  it("preserves deterministic contiguous chunk indexes", () => {
    const chunks = splitGen5EventRequest(generator, 2, 3);
    expect(chunks).toEqual([
      { index: 0, start: 0, count: 3 },
      { index: 1, start: 3, count: 3 },
      { index: 2, start: 6, count: 3 },
      { index: 3, start: 9, count: 1 },
    ]);
  });

  it("rejects upstream range and cross-field violations", () => {
    expect(() =>
      validateGen5EventRequest({
        ...generator,
        event: { ...generator.event, level: 101 },
      }),
    ).toThrow(/Level/);
    expect(() =>
      validateGen5EventRequest({
        ...generator,
        initialAdvances: 0xffff_ffff,
        maxAdvances: 1,
      }),
    ).toThrow(/exceeds/);
    expect(() =>
      validateGen5EventRequest({
        ...generator,
        event: {
          ...generator.event,
          ivs: [null, 32, null, null, null, null],
        },
      }),
    ).toThrow(/fixed IV/);
  });

  it("rejects disabled Searcher filters and reversed dates", () => {
    const searcher: Gen5EventSearcherRequest = {
      ...generator,
      mode: "searcher",
      startDate: "2026-08-15",
      endDate: "2026-08-14",
    };
    expect(() => validateGen5EventRequest(searcher)).toThrow(
      "Start date is after end date",
    );
    expect(() =>
      validateGen5EventRequest({
        ...searcher,
        startDate: "2026-08-14",
        filters: { ...searcher.filters, disabled: true },
      }),
    ).toThrow(/cannot be disabled/);
  });

  it("allows Generator profiles without enabled keypress counts", () => {
    expect(() =>
      validateGen5EventRequest({
        ...generator,
        profile: {
          ...generator.profile,
          keypresses: [
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
            false,
          ],
        },
      }),
    ).not.toThrow();
  });

  it("decodes only the requested number of result rows", () => {
    const buffer = new Uint32Array(11 * 2);
    buffer[5] = 10;
    buffer[11 + 5] = 20;
    expect(decodeGen5EventResults(buffer.buffer, 1)).toHaveLength(1);
    expect(decodeGen5EventResults(buffer.buffer, 1)[0].advances).toBe(10);
  });
});
