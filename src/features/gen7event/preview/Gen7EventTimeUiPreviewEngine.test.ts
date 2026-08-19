import { describe, expect, it } from "vitest";
import { gen7EventDefaultSettings } from "../domain";
import {
  gen7EventTimeEpochFromInput,
  type Gen7EventTimeRequest,
  type Gen7EventTimeResult,
} from "../timeDomain";
import { Gen7EventTimeUiPreviewEngine } from "./Gen7EventTimeUiPreviewEngine";

const epoch = gen7EventTimeEpochFromInput("2024-01-01T00:00:00", 55) as bigint;
const request: Gen7EventTimeRequest = {
  version: "ultra-sun",
  startEpoch: epoch,
  endEpoch: epoch,
  tick: 0x041d_9cb9,
  offset: 55,
  minFrame: 478,
  maxFrame: 478,
  profileTid: 0,
  profileSid: 0,
  event: {
    ...gen7EventDefaultSettings("ultra-sun"),
    ec: 0x1234_5678,
    pidType: "specified",
    pid: 0x89ab_cdef,
    fixedIvs: [31, 30, 29, 28, 27, 26],
    natureLocked: true,
    nature: 12,
    abilityLocked: true,
    ability: 1,
    genderLocked: true,
    gender: 0,
  },
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
  },
  resultLimit: 100,
};

describe("Gen7EventTimeUiPreviewEngine", () => {
  it("keeps fixed Event values and time metadata", async () => {
    const results: Gen7EventTimeResult[] = [];
    const engine = new Gen7EventTimeUiPreviewEngine();
    await engine.search(request, {
      onBatch: (batch) => results.push(...batch),
    });
    expect(results[0]).toMatchObject({
      epoch,
      frame: 478,
      ec: 0x1234_5678,
      pid: 0x89ab_cdef,
      ivs: [31, 30, 29, 28, 27, 26],
      nature: 12,
      ability: 2,
      gender: 1,
    });
  });

  it("reports a search cancelled before preview work starts", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new Gen7EventTimeUiPreviewEngine().search(request, {
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({
      cancelled: true,
      processedStates: 0,
      resultCount: 0,
    });
  });
});
