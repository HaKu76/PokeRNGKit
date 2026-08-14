import { describe, expect, it } from "vitest";
import type { Gen5AdjacentSeedsRequest } from "../domain";
import { Gen5AdjacentSeedsUiPreviewEngine } from "./Gen5AdjacentSeedsUiPreviewEngine";

const request: Gen5AdjacentSeedsRequest = {
  version: "black",
  language: "english",
  dsType: "ds",
  mac: "0009BF123456",
  vcount: 0x2e,
  timer0Min: 0x608,
  timer0Max: 0x608,
  gxstat: 6,
  vframe: 5,
  memoryLink: false,
  dateTime: "2000-01-01T00:00:00",
  seconds: 1,
  buttonMask: 0,
  encounter: "standard",
  initialIVAdvance: 0,
  maxIVAdvances: 0,
};

describe("Gen V Adjacent Seeds UI preview engine", () => {
  it("returns deterministic rows and both 25-call preview modes", async () => {
    const engine = new Gen5AdjacentSeedsUiPreviewEngine();
    const progress: number[] = [];
    const summary = await engine.generate(request, {
      onProgress: (value) => progress.push(value.percent),
    });
    expect(summary.results[0]).toMatchObject({
      seed: "5A0F5EED12345678",
      target: true,
      timer0: 0x608,
    });
    expect(progress).toEqual([100]);
    await expect(
      engine.preview({
        seed: summary.results[0].seed,
        pidAdvance: 47,
        mode: "needles",
      }),
    ).resolves.toHaveLength(25);
    await expect(
      engine.preview({
        seed: summary.results[0].seed,
        pidAdvance: 47,
        mode: "chatot",
      }),
    ).resolves.toEqual(expect.arrayContaining([0, 96]));
  });
});
