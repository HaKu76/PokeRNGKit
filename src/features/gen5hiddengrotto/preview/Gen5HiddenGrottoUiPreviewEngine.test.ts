import { describe, expect, it, vi } from "vitest";
import type {
  Gen5HiddenGrottoGeneratorRequest,
  Gen5HiddenGrottoRequest,
  Gen5HiddenGrottoSearcherRequest,
} from "../domain";
import { GEN5_HIDDEN_GROTTO_AREAS } from "../encounters";
import { Gen5HiddenGrottoUiPreviewEngine } from "./Gen5HiddenGrottoUiPreviewEngine";

const generator: Gen5HiddenGrottoGeneratorRequest = {
  operation: "slot-generator",
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
    memoryLink: false,
    shinyCharm: true,
  },
  area: GEN5_HIDDEN_GROTTO_AREAS[0],
  seed: "0",
  initialAdvances: 0,
  maxAdvances: 1,
  offset: 0,
  initialIvAdvances: 0,
  maxIvAdvances: 0,
  lead: { type: "none" },
  grottoPower: "none",
  selectedGroup: 0,
  selectedSlot: 0,
  gender: 0,
  slotFilters: { slotMask: 0, genderMask: 0, groupMask: 0 },
  pokemonFilters: {
    disabled: false,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    natureMask: 0,
    hiddenPowerMask: 0,
    perfectIvValue: 31,
    perfectIvCount: 0,
    levelMin: 1,
    levelMax: 100,
  },
  resultLimit: 2,
  cache: null,
};

function withoutSeed(
  source: Gen5HiddenGrottoGeneratorRequest,
): Omit<Gen5HiddenGrottoGeneratorRequest, "seed"> {
  const copy = { ...source };
  delete (copy as Partial<Gen5HiddenGrottoGeneratorRequest>).seed;
  return copy;
}

function request(
  operation: Gen5HiddenGrottoRequest["operation"],
): Gen5HiddenGrottoRequest {
  if (operation === "slot-generator" || operation === "pokemon-generator")
    return { ...generator, operation };
  return {
    ...withoutSeed(generator),
    operation,
    startDate: "2026-08-14",
    endDate: "2026-08-14",
  } as Gen5HiddenGrottoSearcherRequest;
}

describe("Gen5HiddenGrottoUiPreviewEngine", () => {
  it.each([
    "slot-generator",
    "slot-searcher",
    "pokemon-generator",
    "pokemon-searcher",
  ] as const)("emits deterministic valid rows for %s", async (operation) => {
    const onBatch = vi.fn();
    const onProgress = vi.fn();
    const engine = new Gen5HiddenGrottoUiPreviewEngine();
    await expect(
      engine.search(request(operation), { onBatch, onProgress }),
    ).resolves.toMatchObject({ resultCount: 2, workerCount: 1, percent: 100 });
    expect(onBatch).toHaveBeenCalledTimes(1);
    expect(onBatch.mock.calls[0][0]).toHaveLength(2);
    expect(onBatch.mock.calls[0][0][0]).toMatchObject({
      seed: operation.endsWith("searcher")
        ? "0000123456789ABC"
        : "0000000000000000",
      kind: operation.startsWith("slot") ? "slot" : "pokemon",
    });
    expect(onProgress).toHaveBeenCalledOnce();
  });

  it("treats empty Slot, Group, Nature, and Hidden Power masks as Any", async () => {
    const rows: unknown[][] = [];
    const engine = new Gen5HiddenGrottoUiPreviewEngine();
    await engine.search(request("slot-generator"), {
      onBatch: (batch) => rows.push(batch),
    });
    await engine.search(request("pokemon-generator"), {
      onBatch: (batch) => rows.push(batch),
    });
    expect(rows[0][0]).toMatchObject({ kind: "slot", group: 0, slot: 0 });
    expect(rows[1][0]).toMatchObject({
      kind: "pokemon",
      nature: 0,
      hiddenPower: 0,
    });
  });

  it("reports pre-aborted work without rows", async () => {
    const controller = new AbortController();
    controller.abort();
    const onBatch = vi.fn();
    const engine = new Gen5HiddenGrottoUiPreviewEngine();
    await expect(
      engine.search(generator, { signal: controller.signal, onBatch }),
    ).resolves.toMatchObject({ cancelled: true, resultCount: 0 });
    expect(onBatch).not.toHaveBeenCalled();
  });

  it("preserves uint32 wrapping when previewing advances", async () => {
    const onBatch = vi.fn();
    const engine = new Gen5HiddenGrottoUiPreviewEngine();
    await expect(
      engine.search(
        { ...generator, initialAdvances: 0xffff_ffff, maxAdvances: 1 },
        { onBatch },
      ),
    ).resolves.toMatchObject({ resultCount: 2 });
    expect(
      onBatch.mock.calls[0][0].map((row: { advances: number }) => row.advances),
    ).toEqual([0xffff_ffff, 0]);
  });
});
