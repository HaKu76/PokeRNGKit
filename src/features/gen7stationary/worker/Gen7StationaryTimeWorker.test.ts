import { afterEach, describe, expect, it, vi } from "vitest";
import { GEN7_STATIONARY_TEMPLATES } from "../data";
import {
  gen7StationaryEncounterFromTemplate,
  gen7StationaryTimeEpochFromInput,
  type Gen7StationaryTimeRequest,
} from "../domain";
import { Gen7StationaryTimeWorker } from "./Gen7StationaryTimeWorker";
import type {
  Gen7StationaryTimeWorkerRequest,
  Gen7StationaryTimeWorkerResponse,
} from "./timeMessages";

const template = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "usum" && entry.conceptual,
)!;

const request: Gen7StationaryTimeRequest = {
  version: "ultra-sun",
  startEpoch: gen7StationaryTimeEpochFromInput(
    "2024-01-01T00:00",
    55,
  ) as bigint,
  endEpoch: gen7StationaryTimeEpochFromInput("2024-01-01T00:00", 55) as bigint,
  tick: 0x041d_9cb9,
  offset: 55,
  minFrame: 478,
  maxFrame: 480,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  forcedShiny: false,
  syncNature: null,
  considerDelay: true,
  pelagoShift: 0,
  encounter: gen7StationaryEncounterFromTemplate(template),
  filters: {
    disabled: true,
    shiny: "any",
    gender: "any",
    ability: "any",
    natureMask: 0x1ff_ffff,
    hiddenPowerMask: 0xffff,
    ivMin: [0, 0, 0, 0, 0, 0],
    ivMax: [31, 31, 31, 31, 31, 31],
    perfectIvValue: 31,
    perfectIvCount: 0,
    blink: "any",
  },
  resultLimit: 100,
};

class InitializingWorker {
  static instances: InitializingWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen7StationaryTimeWorkerResponse>) => void) | null =
    null;
  messages: Gen7StationaryTimeWorkerRequest[] = [];
  terminated = false;

  constructor() {
    InitializingWorker.instances.push(this);
  }

  postMessage(message: Gen7StationaryTimeWorkerRequest) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  InitializingWorker.instances = [];
});

describe("Gen7StationaryTimeWorker", () => {
  it("settles a search cancelled while both Wasm modules initialize", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7StationaryTimeWorker();
    const running = engine.search(request);
    await Promise.resolve();
    engine.cancel();
    await expect(running).resolves.toMatchObject({
      cancelled: true,
      processedStates: 0,
      resultCount: 0,
    });
    expect(InitializingWorker.instances[0].terminated).toBe(true);
  });
});
