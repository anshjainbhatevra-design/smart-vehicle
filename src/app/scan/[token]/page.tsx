"use client";

import { useEffect, useState } from "react";

const alertTypes = [
  {
    value: "BLOCKING",
    label: "Vehicle Blocking",
    icon: "🚧",
  },
  {
    value: "LIGHTS_ON",
    label: "Lights Left On",
    icon: "💡",
  },
  {
    value: "VEHICLE_ISSUE",
    label: "Vehicle Issue",
    icon: "🔧",
  },
  {
    value: "EMERGENCY",
    label: "Emergency",
    icon: "🚨",
  },
  {
    value: "OTHER",
    label: "Other",
    icon: "💬",
  },
];

type Vehicle = {
  registrationNumber: string;
  make: string | null;
  model: string | null;
  color: string | null;
};

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default function ScanPage({ params }: PageProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("");
  const [message, setMessage] = useState("");
  const [scannerName, setScannerName] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const [token, setToken] = useState("");

  useEffect(() => {
    params.then(async ({ token: routeToken }) => {
      setToken(routeToken);

      try {
        const response = await fetch(`/api/scan/${routeToken}`);
        const data = await response.json();

        if (data.success) {
          setVehicle(data.vehicle);
        }
      } catch (error) {
        console.error("Vehicle loading error:", error);
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedType) {
      setResult("Please select a reason for contacting the owner.");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/alerts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          type: selectedType,
          message,
          scannerName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult(data.message || "Could not send the alert.");
        return;
      }

      setResult("Alert sent successfully. The vehicle owner has been notified.");
      setSelectedType("");
      setMessage("");
      setScannerName("");
    } catch (error) {
      console.error("Alert submission error:", error);
      setResult("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading vehicle information...</p>
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            Invalid QR Code
          </h1>

          <p className="mt-2 text-gray-600">
            This QR code is invalid or inactive.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Smart Vehicle
          </p>

          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Contact Vehicle Owner
          </h1>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="border-b border-gray-100 pb-5">
            <p className="text-sm text-gray-500">
              Vehicle Registration
            </p>

            <p className="mt-1 text-xl font-bold text-gray-900">
              {vehicle.registrationNumber}
            </p>

            <p className="mt-1 text-gray-600">
              {[vehicle.make, vehicle.model]
                .filter(Boolean)
                .join(" ") || "Vehicle"}
              {vehicle.color ? ` • ${vehicle.color}` : ""}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-900">
              Why are you contacting the owner?
            </p>

            <div className="space-y-3">
              {alertTypes.map((alert) => (
                <label
                  key={alert.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                    selectedType === alert.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="alertType"
                    value={alert.value}
                    checked={selectedType === alert.value}
                    onChange={(event) =>
                      setSelectedType(event.target.value)
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-xl">{alert.icon}</span>

                  <span className="text-sm font-medium text-gray-900">
                    {alert.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6">
              <label
                htmlFor="scannerName"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Your name (optional)
              </label>

              <input
                id="scannerName"
                type="text"
                value={scannerName}
                onChange={(event) =>
                  setScannerName(event.target.value)
                }
                placeholder="Enter your name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="mt-4">
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Message (optional)
              </label>

              <textarea
                id="message"
                value={message}
                onChange={(event) =>
                  setMessage(event.target.value)
                }
                placeholder="Add more details..."
                rows={4}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
              />
            </div>

            {result && (
              <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                {result}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending Alert..." : "Send Alert"}
            </button>
          </form>
        </section>

        <p className="mt-5 text-center text-xs text-gray-500">
          You do not need an account to contact the vehicle owner.
        </p>
      </div>
    </main>
  );
}
