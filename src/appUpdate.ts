export type UpdateState = "idle" | "available" | "applying" | "failed";

// Reload only the window that explicitly requested an update. Other windows
// keep their working copies even when the shared service worker changes.
export function createAppUpdater(reload: () => void) {
  let state: UpdateState = "idle";
  let registration: ServiceWorkerRegistration | undefined;
  let controllerChanged = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const setState = (next: UpdateState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connect(
      next: ServiceWorkerRegistration,
      container: ServiceWorkerContainer,
    ) {
      registration = next;
      const inspect = () => {
        if (next.waiting && container.controller && state !== "applying")
          setState("available");
      };
      const watchInstallation = () => {
        next.installing?.addEventListener("statechange", inspect);
        inspect();
      };
      container.addEventListener("controllerchange", () => {
        // First installation is not an update and must never reload the page.
        if (!hadController) {
          hadController = true;
          return;
        }
        controllerChanged = true;
        if (state === "applying") {
          clearTimeout(timer);
          reload();
        } else setState("available");
      });
      let hadController = Boolean(container.controller);
      next.addEventListener("updatefound", watchInstallation);
      watchInstallation();
    },
    apply() {
      if (state === "idle" || state === "applying") return;
      if (controllerChanged) {
        reload();
        return;
      }
      const waiting = registration?.waiting;
      if (!waiting) {
        setState("failed");
        return;
      }
      setState("applying");
      timer = setTimeout(() => setState("failed"), 15000);
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch {
        clearTimeout(timer);
        setState("failed");
      }
    },
  };
}

export const appUpdater = createAppUpdater(() => window.location.reload());
