"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Alert = {
  id: string;
  type: string;
  message: string | null;
  scannerName: string | null;
  status: string;
  createdAt: string;
  vehicle: {
    registrationNumber: string;
    make: string | null;
    model: string | null;
    color: string | null;
  };
  response: {
    message: string;
    createdAt: string;
  } | null;
};

export default function OwnerDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);

  // Push notification state
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "">("");
  const [notifMsg, setNotifMsg] = useState("");
  const [enablingNotif, setEnablingNotif] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [disablingNotif, setDisablingNotif] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        Notification.permission === "granted"
      ) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setHasSubscription(!!subscription);
        } catch (err) {
          console.error("Error checking push subscription status:", err);
        }
      }
    }
    checkSubscription();
  }, []);

  useEffect(() => {
    async function loadOwner() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Unable to identify current user.");
          setLoading(false);
          return;
        }

        setOwnerId(data.user.id);

        // Initialise push permission state from browser
        if (typeof window !== "undefined" && "Notification" in window) {
          setNotifPermission(Notification.permission);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setError("Unable to identify current user.");
        setLoading(false);
      }
    }

    loadOwner();
  }, []);

  // ── Push registration ─────────────────────────────────────────
  // Converts a VAPID public key from URL-safe base64 to a Uint8Array.
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Registers the service worker, waits for it to become active, subscribes
  // to PushManager, and POSTs the subscription to the server.
  // Throws on any failure so the caller can show a proper error.
  async function registerPush(session: { access_token: string }) {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    }

    // Step 1: Register the SW (idempotent — safe to call even if already registered).
    await navigator.serviceWorker.register("/sw.js");

    // Step 2: Wait until an active service worker controls the page.
    // navigator.serviceWorker.ready resolves ONLY when a worker is active.
    // This is the only correct moment to call pushManager.subscribe().
    const registration = await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      }));

    // Step 3: Persist / refresh the subscription on the server.
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!res.ok) {
      throw new Error("Failed to save push subscription on server");
    }

    setHasSubscription(true);
  }

  // Called when the owner clicks the "Enable Notifications" button.
  async function handleEnableNotifications() {
    if (enablingNotif) return;
    setEnablingNotif(true);
    setNotifMsg("");

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === "granted") {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          // registerPush throws on any failure — only show success if it resolves.
          await registerPush(session);
          setNotifMsg("Notifications enabled.");
        } else {
          setNotifMsg("Session expired. Please log in again.");
        }
      } else {
        setNotifMsg(
          "Notifications are blocked. Please enable them in your browser settings."
        );
      }
    } catch (err) {
      console.error("Enable notifications error:", err);
      setNotifMsg("Could not enable notifications. Please try again.");
    } finally {
      setEnablingNotif(false);
    }
  }

  // Called when the owner clicks the "Disable Notifications" button.
  async function handleDisableNotifications() {
    if (disablingNotif) return;
    setDisablingNotif(true);
    setNotifMsg("");

    try {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        throw new Error("Push notifications are not supported on this browser.");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Step 1: Remove from the server database first
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const res = await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || "Failed to remove subscription from database.");
          }
        }

        // Step 2: Unsubscribe on the browser
        await subscription.unsubscribe();
      }

      setHasSubscription(false);
      setNotifMsg("Notifications disabled.");
    } catch (err: any) {
      console.error("Disable notifications error:", err);
      setNotifMsg(err.message || "Could not disable notifications. Please try again.");
    } finally {
      setDisablingNotif(false);
    }
  }
  // ───────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadAlerts() {
      if (!ownerId) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch(
          `/api/owner/alerts?ownerId=${ownerId}`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Unable to load alerts.");
          return;
        }

        setAlerts(data.alerts);

        // Auto-subscribe silently if the owner has already granted permission
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          void registerPush(session);
        }
      } catch (error) {
        console.error("Dashboard error:", error);
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    }

    loadAlerts();
  }, [ownerId]);
  async function handleLogout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    setError("Unable to log out.");
    return;
  }

  window.location.href = "/login";
}
  async function handleResponse(alertId: string) {
  if (!ownerId) {
    setError("Please log in to continue.");
    return;
  }

  if (!responseMessage.trim()) {
    setError("Please enter a response message.");
    return;
  }

  setSendingResponse(true);
  setError("");

  try {
    // Get the current Supabase authentication session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If session is missing, send user back to login
    if (!session) {
      window.location.href = "/login";
      return;
    }

    // Send response with authentication token
    const response = await fetch("/api/alerts/respond", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        alertId,
        message: responseMessage.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.message || "Unable to send response.");
      return;
    }

    // Refresh alerts after successful response
    const alertsResponse = await fetch(
      `/api/owner/alerts?ownerId=${ownerId}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    const alertsData = await alertsResponse.json();

    if (alertsResponse.ok) {
      setAlerts(alertsData.alerts);
    }

    setRespondingTo(null);
    setResponseMessage("");
  } catch (error) {
    console.error("Response error:", error);
    setError("Unable to send response.");
  } finally {
    setSendingResponse(false);
  }
}

  function getAlertLabel(type: string) {
    switch (type) {
      case "BLOCKING":
        return "🚧 Vehicle Blocking";
      case "LIGHTS_ON":
        return "💡 Lights Left On";
      case "VEHICLE_ISSUE":
        return "🔧 Vehicle Issue";
      case "EMERGENCY":
        return "🚨 Emergency";
      case "OTHER":
        return "💬 Other";
      default:
        return type;
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading alerts...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
  <div>
    <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
      Smart Vehicle
    </p>

    <h1 className="mt-2 text-3xl font-bold text-gray-900">
      Owner Dashboard
    </h1>

    <p className="mt-2 text-gray-600">
      View alerts received for your vehicles.
    </p>
  </div>

  <button
    type="button"
    onClick={handleLogout}
    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
  >
    Logout
  </button>
</div>

        {/* Notification permission status / actions */}
        {notifMsg && (!hasSubscription || notifMsg !== "Notifications enabled.") && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${
            notifMsg.toLowerCase().includes("error") || 
            notifMsg.toLowerCase().includes("fail") || 
            notifMsg.toLowerCase().includes("block") ||
            notifMsg.toLowerCase().includes("expired")
              ? "bg-red-50 text-red-700"
              : notifMsg.toLowerCase().includes("disable")
                ? "bg-blue-50 text-blue-700"
                : "bg-green-50 text-green-700"
          }`}>
            <p>{notifMsg}</p>
          </div>
        )}

        {((notifPermission === "default") || (notifPermission === "granted" && !hasSubscription)) && (
          <div className="mb-5 flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3">
            <p className="text-sm text-blue-700">
              Enable notifications to receive instant alerts when someone scans your vehicle.
            </p>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={enablingNotif}
              className="ml-4 shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {enablingNotif ? "Enabling…" : "🔔 Enable Notifications"}
            </button>
          </div>
        )}

        {notifPermission === "denied" && (
          <div className="mb-5 rounded-xl bg-yellow-50 px-4 py-3">
            <p className="text-sm text-yellow-800">
              🔕 Notifications are blocked in your browser. To receive alerts, enable notifications in your browser settings and reload the page.
            </p>
          </div>
        )}

        {notifPermission === "granted" && hasSubscription && (
          <div className="mb-5 flex items-center justify-between rounded-xl bg-green-50 px-4 py-3">
            <p className="text-sm text-green-700">
              ✓ Notifications enabled.
            </p>
            <button
              type="button"
              onClick={handleDisableNotifications}
              disabled={disablingNotif}
              className="ml-4 shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              {disablingNotif ? "Disabling…" : "Disable Notifications"}
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {alerts.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">
              No alerts received yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <section
                key={alert.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {getAlertLabel(alert.type)}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {alert.vehicle.registrationNumber}
                      {alert.vehicle.make
                        ? ` • ${alert.vehicle.make}`
                        : ""}
                      {alert.vehicle.model
                        ? ` ${alert.vehicle.model}`
                        : ""}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      alert.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {alert.status}
                  </span>
                </div>

                {alert.message && (
                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-700">
                      {alert.message}
                    </p>
                  </div>
                )}

                {alert.scannerName && (
                  <p className="mt-3 text-xs text-gray-500">
                    From: {alert.scannerName}
                  </p>
                )}

                {alert.response && (
                  <div className="mt-4 rounded-xl bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase text-blue-700">
                      Your Response
                    </p>

                    <p className="mt-1 text-sm text-blue-900">
                      {alert.response.message}
                    </p>
                  </div>
                )}
                {alert.status === "PENDING" && (
  <div className="mt-4">
    {respondingTo === alert.id ? (
      <div className="rounded-xl border border-gray-200 p-4">
        <label
          htmlFor={`response-${alert.id}`}
          className="mb-2 block text-sm font-semibold text-gray-900"
        >
          Your response
        </label>

        <textarea
          id={`response-${alert.id}`}
          value={responseMessage}
          onChange={(event) =>
            setResponseMessage(event.target.value)
          }
          placeholder="Write a response to the person..."
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
        />

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={() => handleResponse(alert.id)}
            disabled={sendingResponse}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sendingResponse ? "Sending..." : "Send Response"}
          </button>

          <button
            type="button"
            onClick={() => {
              setRespondingTo(null);
              setResponseMessage("");
            }}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setRespondingTo(alert.id)}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Respond
      </button>
    )}
  </div>
)}

                <p className="mt-4 text-xs text-gray-400">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
