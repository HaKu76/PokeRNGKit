import { afterEach, describe, expect, it, vi } from "vitest";
import { gen7EventDefaultSettings } from "../domain";
import {
  gen7EventTimeEpochFromInput,
  type Gen7EventTimeRequest,
} from "../timeDomain";
import { Gen7EventTimeWorker } from "./Gen7EventTimeWorker";
import type {
  Gen7EventTimeWorkerRequest,
  Gen7EventTimeWorkerResponse,
} from "./timeMessages";

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
  event: gen7EventDefaultSettings("ultra-sun"),
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

class InitializingWorker {
  static instances: InitializingWorker[] = [];
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen7EventTimeWorkerResponse>) => void) | null = null;
  messages: Gen7EventTimeWorkerRequest[] = [];
  terminated = false;
  constructor() {
    InitializingWorker.instances.push(this);
  }
  postMessage(message: Gen7EventTimeWorkerRequest) {
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

describe("Gen7EventTimeWorker", () => {
  it("settles a search cancelled while both Wasm modules initialize", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7EventTimeWorker();
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
