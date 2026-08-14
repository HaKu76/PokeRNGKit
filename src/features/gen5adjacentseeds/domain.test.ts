import { describe, expect, it } from "vitest";
import {
  adjacentSeedsRequestFromProfile,
  formatGen5AdjacentPreview,
  normalizeGen5AdjacentDateTime,
  splitGen5AdjacentSeedsRequest,
  validateGen5AdjacentSeedsRequest,
  type Gen5AdjacentSeedsRequest,
} from "./domain";
import type { Gen5Profile } from "../gen5profiles/domain";

const request: Gen5AdjacentSeedsRequest = {
  version: "black",
  language: "english",
  dsType: "ds",
  mac: "0009BF123456",
  vcount: 0x2e,
  timer0Min: 0x608,
  timer0Max: 0x609,
  gxstat: 6,
  vframe: 5,
  memoryLink: false,
  dateTime: "2000-01-01T00:00:00",
  seconds: 1,
  buttonMask: 0,
  encounter: "standard",
  initialIVAdvance: 0,
  maxIVAdvances: 1,
};

describe("Gen V Adjacent Seeds domain", () => {
  it("keeps upstream ranges and divides second offsets deterministically", () => {
    expect(validateGen5AdjacentSeedsRequest(request)).toBe(request);
    expect(splitGen5AdjacentSeedsRequest(request, 2)).toEqual([
      { index: 0, minSecondOffset: -1, maxSecondOffset: 0 },
      { index: 1, minSecondOffset: 1, maxSecondOffset: 1 },
    ]);
  });

  it("restores seconds omitted by datetime-local normalization", () => {
    expect(normalizeGen5AdjacentDateTime("2000-01-01T00:00")).toBe(
      "2000-01-01T00:00:00",
    );
    expect(normalizeGen5AdjacentDateTime(request.dateTime)).toBe(
      request.dateTime,
    );
  });

  it("rejects advance overflow and browser-sized result explosions", () => {
    expect(() =>
      validateGen5AdjacentSeedsRequest({
        ...request,
        initialIVAdvance: 0xffff_ffff,
      }),
    ).toThrow(/32-bit/);
    expect(() =>
      validateGen5AdjacentSeedsRequest({
        ...request,
        timer0Min: 0,
        timer0Max: 0xffff,
      }),
    ).toThrow(/browser limit/);
  });

  it("copies the calibrated profile fields and formats both previews", () => {
    const profile = {
      version: "black2",
      language: "japanese",
      dsType: "3ds",
      mac: "123456789ABC",
      vcount: 0x82,
      timer0Min: 0x1103,
      timer0Max: 0x1104,
      gxstat: 6,
      vframe: 8,
      memoryLink: true,
    } as Gen5Profile;
    expect(
      adjacentSeedsRequestFromProfile(profile, {
        dateTime: request.dateTime,
        seconds: 1,
        buttonMask: 3,
        encounter: "roamer",
        initialIVAdvance: 2,
        maxIVAdvances: 4,
      }),
    ).toMatchObject({
      version: "black2",
      mac: "123456789ABC",
      timer0Min: 0x1103,
      memoryLink: true,
      buttonMask: 3,
    });
    expect(formatGen5AdjacentPreview([0, 19, 20, 99], "chatot")).toBe(
      "L 0, L 19, ML 20, H 99",
    );
    expect(formatGen5AdjacentPreview([0, 3, 7], "needles")).toBe("↑, ↘, ↖");
  });
});
