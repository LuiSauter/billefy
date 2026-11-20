// Billefy service worker: Web Push display + notification click handling.
// Served as a static asset from /sw.js (no build step, no imports).

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  // Backend payload shape: { title, body, data } (VapidWebPushGateway).
  const title = payload.title || "Billefy";
  const options = {
    body: payload.body || "",
    data: payload.data || {},
    icon: "/favicon.ico",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            return client.focus();
          }
        }
        return self.clients.openWindow("/");
      })
  );
});
