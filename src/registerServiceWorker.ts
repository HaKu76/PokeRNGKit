const UPDATE_CHECK_INTERVAL = 5 * 60 * 1000;

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.href);
  const serviceWorkerUrl = new URL("sw.js", baseUrl).toString();

  void navigator.serviceWorker
    .register(serviceWorkerUrl, { updateViaCache: "none" })
    .then((registration) => {
      const checkForUpdate = () => {
        void registration.update().catch(() => undefined);
      };
      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") checkForUpdate();
      };

      window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
      document.addEventListener("visibilitychange", handleVisibilityChange);
    })
    .catch(() => undefined);
}
