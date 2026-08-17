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
      } catch (error) {
        console.error("Auth error:", error);
        setError("Unable to identify current user.");
        setLoading(false);
      }
    }

    loadOwner();
  }, []);

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
