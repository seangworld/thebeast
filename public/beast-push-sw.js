/* Notification delivery only: no authenticated pages or records are cached. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
    if (!data || typeof data !== "object") data = {};
  } catch {}
  const allowed = [
    "/dashboard/notifications",
    "/dashboard/money/bills",
    "/dashboard/messages",
    "/dashboard/admin/messages",
  ];
  const url = allowed.includes(data.url)
    ? data.url
    : "/dashboard/notifications";
  event.waitUntil(
    self.registration.showNotification(
      typeof data.title === "string"
        ? data.title.slice(0, 100)
        : "Beast notification",
      {
        body:
          typeof data.body === "string"
            ? data.body.slice(0, 500)
            : "Open Beast to review your updates.",
        icon: "/beast-head-icon.png",
        badge: "/beast-head-icon.png",
        tag:
          typeof data.tag === "string"
            ? data.tag.slice(0, 100)
            : "beast-update",
        data: { url },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const allowed = [
    "/dashboard/notifications",
    "/dashboard/money/bills",
    "/dashboard/messages",
    "/dashboard/admin/messages",
  ];
  const path = allowed.includes(event.notification.data?.url)
    ? event.notification.data.url
    : "/dashboard/notifications";
  const target = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        const found = windows.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (found) {
          await found.navigate(target);
          return found.focus();
        }
        return clients.openWindow(target);
      }),
  );
});
