import { afterEach, describe, expect, it, vi } from "vitest";
import { createAppUpdater } from "./appUpdate";

function setup(controlled = true, waiting = true) {
  const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() });
  const registration = Object.assign(new EventTarget(), {
    waiting: waiting ? worker : null,
    installing: worker,
  });
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
  });
  const reload = vi.fn();
  const updater = createAppUpdater(reload);
  updater.connect(
    registration as unknown as ServiceWorkerRegistration,
    container as unknown as ServiceWorkerContainer,
  );
  return { updater, registration, container, worker, reload };
}

afterEach(() => vi.useRealTimers());
describe("explicit page updates", () => {
  it("offers an already waiting update without activating or reloading it", () => {
    const { updater, worker, reload } = setup();
    expect(updater.getSnapshot()).toBe("available");
    expect(worker.postMessage).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
  it("detects an update installed while the page is open", () => {
    const { updater, registration, worker } = setup(true, false);
    expect(updater.getSnapshot()).toBe("idle");
    registration.dispatchEvent(new Event("updatefound"));
    registration.waiting = worker;
    worker.dispatchEvent(new Event("statechange"));
    expect(updater.getSnapshot()).toBe("available");
  });
  it("reloads only after explicit activation has changed the controller", () => {
    vi.useFakeTimers();
    const { updater, worker, container, reload } = setup();
    updater.apply();
    updater.apply();
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "SKIP_WAITING",
    });
    expect(reload).not.toHaveBeenCalled();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("keeps another window's working copy until that window chooses reload", () => {
    const { updater, container, reload, worker } = setup();
    container.dispatchEvent(new Event("controllerchange"));
    expect(reload).not.toHaveBeenCalled();
    updater.apply();
    expect(reload).toHaveBeenCalledOnce();
    expect(worker.postMessage).not.toHaveBeenCalled();
  });
  it("does not offer or reload the first installation", () => {
    const { updater, container, reload } = setup(false, false);
    container.dispatchEvent(new Event("controllerchange"));
    updater.apply();
    expect(updater.getSnapshot()).toBe("idle");
    expect(reload).not.toHaveBeenCalled();
  });
  it("times out safely and allows retry instead of discarding edits", () => {
    vi.useFakeTimers();
    const { updater, reload, worker } = setup();
    updater.apply();
    vi.advanceTimersByTime(15000);
    expect(updater.getSnapshot()).toBe("failed");
    expect(reload).not.toHaveBeenCalled();
    updater.apply();
    expect(worker.postMessage).toHaveBeenCalledTimes(2);
  });
  it("reports a disappeared waiting worker or message failure without reload", () => {
    const { updater, registration, worker, reload } = setup();
    worker.postMessage.mockImplementation(() => {
      throw new Error("gone");
    });
    updater.apply();
    expect(updater.getSnapshot()).toBe("failed");
    registration.waiting = null;
    updater.apply();
    expect(updater.getSnapshot()).toBe("failed");
    expect(reload).not.toHaveBeenCalled();
  });
});
