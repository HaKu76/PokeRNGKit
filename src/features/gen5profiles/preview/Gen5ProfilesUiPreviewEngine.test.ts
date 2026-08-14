import { describe, expect, it } from "vitest";
import type { Gen5CalibrationRequest } from "../domain";
import { Gen5ProfilesUiPreviewEngine } from "./Gen5ProfilesUiPreviewEngine";

const request: Gen5CalibrationRequest = {
  mode: "seed",
  version: "black",
  language: "english",
  dsType: "ds",
  mac: "0009BF123456",
  buttonMask: 0,
  date: "2000-01-01",
  hour: 0,
  minute: 0,
  minSeconds: 0,
  maxSeconds: 0,
  minVCount: 0x50,
  maxVCount: 0x50,
  minTimer0: 0x0c60,
  maxTimer0: 0x0c60,
  minGxStat: 6,
  maxGxStat: 6,
  minVFrame: 0,
  maxVFrame: 0,
  minIVs: [0, 0, 0, 0, 0, 0],
  maxIVs: [31, 31, 31, 31, 31, 31],
  needles: [],
  needleType: "unova-link",
  memoryLink: false,
  seed: "0123456789ABCDEF",
  resultLimit: 1000,
};

describe("Gen V profile UI preview engine", () => {
  it("returns deterministic local preview data without Wasm", async () => {
    const progress: number[] = [];
    const summary = await new Gen5ProfilesUiPreviewEngine().search(request, {
      onProgress: (value) => progress.push(value.percent),
    });

    expect(summary.results).toEqual([
      {
        seed: request.seed,
        seconds: 0,
        vcount: 0x50,
        timer0: 0x0c60,
        gxstat: 6,
        vframe: 0,
      },
    ]);
    expect(progress).toEqual([100]);
  });
});
