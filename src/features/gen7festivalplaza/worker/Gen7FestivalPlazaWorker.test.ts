import { afterEach, describe, expect, it, vi } from "vitest";
import type { Gen7FestivalPlazaRequest } from "../domain";
import { Gen7FestivalPlazaWorker } from "./Gen7FestivalPlazaWorker";
import type {
  Gen7FestivalPlazaWorkerRequest,
  Gen7FestivalPlazaWorkerResponse,
} from "./messages";

const request: Gen7FestivalPlazaRequest = {
  seed: 0,
  minFrame: 0,
  maxFrame: 100,
  version: "sun",
  npc: 0,
  delay: 0,
  rank: 18,
  starFilter: 0,
  facilityFilter: -1,
  npcTypeFilter: -1,
  colorFilter: -1,
  includeNpcStatus: false,
  resultLimit: 100,
};

class InitializingWorker {
  static instances: InitializingWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen7FestivalPlazaWorkerResponse>) => void) | null =
    null;
  messages: Gen7FestivalPlazaWorkerRequest[] = [];
  terminated = false;

  constructor() {
    InitializingWorker.instances.push(this);
  }

  postMessage(message: Gen7FestivalPlazaWorkerRequest) {
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

describe("Gen7FestivalPlazaWorker", () => {
  it("settles a search cancelled while the Worker is initializing", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7FestivalPlazaWorker();
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
