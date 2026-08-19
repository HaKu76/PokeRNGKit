import { describe, expect, it } from "vitest";
import {
  decodeGen6TinyTimelineResults,
  encodeGen6TinyTimelineRequest,
  formatGen6TinyTimelineRealTime,
  GEN6_TINYTIMELINE_REQUEST_WORDS,
  validateGen6TinyTimelineRequest,
  type Gen6TinyTimelineRequest,
} from "./domain";

const request: Gen6TinyTimelineRequest = {
  state: [0x11111111, 0x22222222, 0x33333333, 0x44444444],
  startingFrame: 0,
  targetFrame: 5000,
  method: 0,
  events: [{ frame: 500, type: 0 }],
  parameter1: 1,
  parameter2: 0,
  boost: false,
  isOras: false,
  delay: 0,
  cryFrame: -1,
  considerDelay: false,
  resultLimit: 1000,
};

describe("Gen VI TinyMT Timeline domain", () => {
  it("encodes the fixed-width request and empty cry sentinel", () => {
    const words = encodeGen6TinyTimelineRequest(request);
    expect(words).toHaveLength(GEN6_TINYTIMELINE_REQUEST_WORDS);
    expect(words[0]).toBe(0x11111111);
    expect(words[7]).toBe(1);
    expect(words[8]).toBe(500);
    expect(words[20]).toBe(0xffffffff);
  });

  it("enforces method event types and browser frame protection", () => {
    expect(() =>
      validateGen6TinyTimelineRequest({
        ...request,
        method: 9,
        events: [{ frame: 500, type: 0 }],
      }),
    ).toThrow(/event type|event count/i);
    expect(() =>
      validateGen6TinyTimelineRequest({
        ...request,
        targetFrame: 5_000_001,
      }),
    ).toThrow(/5000000/);
  });

  it("decodes signed frame bounds and method metadata", () => {
    const words = new Uint32Array(16);
    words[0] = 3;
    words[1] = 0xfffffffe;
    words[2] = 0;
    words[3] = 4;
    words[9] = (4 << 8) | 1;
    const [result] = decodeGen6TinyTimelineResults(words.buffer);
    expect(result.frameMin).toBe(-2);
    expect(result.method).toBe(4);
    expect(result.sync).toBe(true);
    expect(formatGen6TinyTimelineRealTime(result, 0)).toBe("0.000s ~ 0.000s");
  });
});
