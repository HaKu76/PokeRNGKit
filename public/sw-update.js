let isUpdate = false;

self.addEventListener("install", () => {
  isUpdate = Boolean(self.registration.active);
});

self.addEventListener("activate", (event) => {
  if (!isUpdate) return;

  event.waitUntil(
    self.clients
      .claim()
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) =>
        Promise.all(
          clients.map((client) =>
            client.navigate(client.url).catch(() => undefined),
          ),
        ),
      ),
  );
});
