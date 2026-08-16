import { afterEach, describe, expect, it, vi } from "vitest";
import type { Gen7BattleTreeRequest } from "../domain";
import { Gen7BattleTreeWorker } from "./Gen7BattleTreeWorker";
import type {
  Gen7BattleTreeWorkerRequest,
  Gen7BattleTreeWorkerResponse,
} from "./messages";

const request: Gen7BattleTreeRequest = {
  seed: 0,
  minFrame: 0,
  maxFrame: 100,
  version: "sun",
  npc: 0,
  delay: 0,
  streak: 1,
  trainerFilter: 254,
  resultLimit: 100,
};

class InitializingWorker {
  static instances: InitializingWorker[] = [];

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage:
    ((event: MessageEvent<Gen7BattleTreeWorkerResponse>) => void) | null = null;
  messages: Gen7BattleTreeWorkerRequest[] = [];
  terminated = false;

  constructor() {
    InitializingWorker.instances.push(this);
  }

  postMessage(message: Gen7BattleTreeWorkerRequest) {
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

describe("Gen7BattleTreeWorker", () => {
  it("settles a search cancelled while the Worker is initializing", async () => {
    vi.stubGlobal("Worker", InitializingWorker);
    vi.stubGlobal("location", { href: "https://example.test/PokeRNGKit/" });
    const engine = new Gen7BattleTreeWorker();
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
