/**
 * SmartVehicle Service Worker — Phase 3
 * Handles Web Push notifications for vehicle alert events.
 *
 * This file MUST live at /public/sw.js so it is served at the root
 * path /sw.js — required by the Push API scope rules.
 */

// ─── Push Event ───────────────────────────────────────────────────────────────
// Fired when the server sends a push message to this subscription.

self.addEventListener("push", function (event) {
  let data = {
    title: "SmartVehicle Alert",
    body: "Someone has sent an alert about your vehicle.",
    url: "/owner/dashboard",
  };

  // Parse payload sent by /api/alerts/create
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        title: parsed.title || data.title,
        body: parsed.body || data.body,
        url: parsed.url || data.url,
      };
    } catch {
      // Payload was plain text — use default data
    }
  }

  const options = {
    body: data.body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "smartvehicle-alert",       // replaces previous notification of same tag
    renotify: true,                   // vibrate / sound even when replacing
    requireInteraction: false,
    data: {
      url: data.url,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ─── Notification Click Event ─────────────────────────────────────────────────
// Fired when the user clicks the notification.

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/owner/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // If the dashboard is already open in a tab, focus it
        for (const client of clientList) {
          if (client.url.includes("/owner/dashboard") && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ─── Install & Activate ───────────────────────────────────────────────────────
// Minimal lifecycle handlers — no caching needed for this service worker.

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
