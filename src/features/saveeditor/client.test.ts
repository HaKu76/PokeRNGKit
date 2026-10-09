import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { SaveEditorClient } from "./client";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: { message: string }) => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
}
describe("save player context across Worker lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWorker.instances = [];
    vi.stubGlobal("Worker", FakeWorker);
    vi.stubGlobal("window", { location: { href: "http://127.0.0.1:5173/" } });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it("preserves an explicit player after recreation and undo while resetting new files", async () => {
    const client = new SaveEditorClient(),
      source = new Uint8Array([1, 2, 3]);
    const open = client.run(source),
      first = FakeWorker.instances[0],
      message = first.postMessage.mock.calls[0][0];
    expect(message.brProfile).toBe(-1);
    expect(message.bytes).not.toBe(source);
    first.onmessage?.({
      data: { id: message.id, report: { brProfiles: { active: 1 } } },
    });
    await open;
    const select = client.run(source, "3", "brProfile"),
      selection = first.postMessage.mock.calls[1][0];
    expect(selection.brProfile).toBe(1);
    first.onmessage?.({
      data: { id: selection.id, report: { brProfiles: { active: 3 } } },
    });
    await select;
    client.dispose();
    const restored = client.run(source, undefined, "inspectWorking"),
      fresh = FakeWorker.instances[1],
      restore = fresh.postMessage.mock.calls[0][0];
    expect(restore.brProfile).toBe(3);
    fresh.onmessage?.({
      data: { id: restore.id, report: { brProfiles: { active: 3 } } },
    });
    await restored;
    const next = client.run(source),
      nextMessage = fresh.postMessage.mock.calls[1][0];
    expect(nextMessage.brProfile).toBe(-1);
    fresh.onmessage?.({
      data: { id: nextMessage.id, report: { brProfiles: { active: 0 } } },
    });
    await next;
    expect(vi.getTimerCount()).toBe(0);
    client.dispose();
  });
  it("keeps the prior player after a rejected selection", async () => {
    const client = new SaveEditorClient();
    const start = client.run(new Uint8Array([1])),
      worker = FakeWorker.instances[0],
      first = worker.postMessage.mock.calls[0][0];
    worker.onmessage?.({
      data: { id: first.id, report: { brProfiles: { active: 2 } } },
    });
    await start;
    const failed = client.run(new Uint8Array([1]), "4", "brProfile"),
      invalid = worker.postMessage.mock.calls[1][0];
    worker.onmessage?.({
      data: { id: invalid.id, error: "Invalid Battle Revolution player." },
    });
    await expect(failed).rejects.toThrow("player");
    const read = client.run(new Uint8Array([1]), undefined, "br4Gear"),
      message = worker.postMessage.mock.calls[2][0];
    expect(message.brProfile).toBe(2);
    worker.onmessage?.({
      data: { id: message.id, report: { brProfiles: { active: 2 } } },
    });
    await read;
    client.dispose();
  });
});
