import { afterEach, describe, expect, it, vi } from "vitest";
import { gen7EventDefaultSettings, type Gen7EventRequest } from "../domain";
import { Gen7EventWorker } from "./Gen7EventWorker";
import type {
  Gen7EventWorkerRequest,
  Gen7EventWorkerResponse,
} from "./messages";

const request: Gen7EventRequest = {
  version: "sun",
  seed: 0,
  minFrame: 418,
  maxFrame: 518,
  tsv: 0,
  trv: 0,
  npc: 0,
  delay: 0,
  considerDelay: false,
  event: gen7EventDefaultSettings("sun", 25),
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
  onmessage: ((event: MessageEvent<Gen7EventWorkerResponse>) => void) | null =
    null;
  messages: Gen7EventWorkerRequest[] = [];
  terminated = false;

  constructor() {
    InitializingWorker.instances.push(this);
  }

  postMessage(message: Gen7EventWorkerRequest) {
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

describe("Gen7EventWorker", () => {
  it("settles a search cancelled while the Worker is initializing", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7EventWorker();
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
