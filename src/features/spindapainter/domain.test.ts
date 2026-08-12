import { describe, expect, it } from "vitest";
import {
  clampSpindaSpotPosition,
  spindaPidFromSpotPositions,
  spindaSpotPositionsFromPid,
} from "./domain";

describe("Spinda Painter domain", () => {
  it("maps PID zero to the PokeFinder origin positions", () => {
    expect(spindaSpotPositionsFromPid(0)).toEqual([
      { x: 64, y: 48 },
      { x: 256, y: 56 },
      { x: 112, y: 192 },
      { x: 208, y: 200 },
    ]);
  });

  it("maps every PID byte to its matching spot coordinate", () => {
    expect(spindaSpotPositionsFromPid(0xfedcba98)).toEqual([
      { x: 128, y: 120 },
      { x: 336, y: 144 },
      { x: 208, y: 296 },
      { x: 320, y: 320 },
    ]);
  });

  it("reconstructs the PID from clamped spot positions", () => {
    const pid = 0x6c3a07f1;
    expect(spindaPidFromSpotPositions(spindaSpotPositionsFromPid(pid))).toBe(
      pid,
    );
  });

  it("clamps a dragged spot to its upstream bounds without snapping it", () => {
    expect(clampSpindaSpotPosition(0, { x: 61, y: 173 })).toEqual({
      x: 64,
      y: 168,
    });
    expect(clampSpindaSpotPosition(3, { x: 331, y: 197 })).toEqual({
      x: 328,
      y: 200,
    });
    expect(clampSpindaSpotPosition(0, { x: 69, y: 71 })).toEqual({
      x: 69,
      y: 71,
    });
  });
});
