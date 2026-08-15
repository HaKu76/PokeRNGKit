import { afterEach, describe, expect, it, vi } from "vitest";
import { GEN7_STATIONARY_TEMPLATES } from "../data";
import {
  gen7StationaryEncounterFromTemplate,
  type Gen7StationaryRequest,
} from "../domain";
import { Gen7StationaryWorker } from "./Gen7StationaryWorker";
import type {
  Gen7StationaryWorkerRequest,
  Gen7StationaryWorkerResponse,
} from "./messages";

const template = GEN7_STATIONARY_TEMPLATES.find(
  (entry) => entry.family === "sm" && entry.conceptual,
)!;

const request: Gen7StationaryRequest = {
  version: "sun",
  seed: 0,
  minFrame: 418,
  maxFrame: 518,
  tsv: 0,
  trv: 0,
  shinyCharm: false,
  forcedShiny: false,
  syncNature: 0,
  considerDelay: false,
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
    ((event: MessageEvent<Gen7StationaryWorkerResponse>) => void) | null = null;
  messages: Gen7StationaryWorkerRequest[] = [];
  terminated = false;

  constructor() {
    InitializingWorker.instances.push(this);
  }

  postMessage(message: Gen7StationaryWorkerRequest) {
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

describe("Gen7StationaryWorker", () => {
  it("settles a search cancelled while the Worker is still initializing", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7StationaryWorker();
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
