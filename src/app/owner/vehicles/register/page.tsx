"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterVehiclePage() {
  const router = useRouter();

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !registrationNumber.trim() ||
      !make.trim() ||
      !model.trim() ||
      !color.trim()
    ) {
      setError("Please fill in all vehicle details.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get logged-in user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Register vehicle
      const response = await fetch("/api/vehicles/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          registrationNumber,
          make,
          model,
          color,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to register vehicle.");
        return;
      }

      // Vehicle successfully created
      router.push("/owner/vehicles");
    } catch (error) {
      console.error("Vehicle registration error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={() => router.push("/owner/vehicles")}
          className="mb-6 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          ← Back to My Vehicles
        </button>

        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Smart Vehicle
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Add Vehicle
          </h1>

          <p className="mt-2 text-gray-600">
            Register your vehicle and generate its Smart Vehicle QR code.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="registrationNumber"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Registration Number *
              </label>

              <input
                id="registrationNumber"
                type="text"
                value={registrationNumber}
                onChange={(event) =>
                  setRegistrationNumber(event.target.value)
                }
                placeholder="e.g. MH01AB1234"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="make"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Make
              </label>

              <input
                id="make"
                type="text"
                value={make}
                onChange={(event) => setMake(event.target.value)}
                placeholder="e.g. Maruti"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="model"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Model
              </label>

              <input
                id="model"
                type="text"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="e.g. Swift"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="mt-5">
              <label
                htmlFor="color"
                className="mb-2 block text-sm font-semibold text-gray-900"
              >
                Color
              </label>

              <input
                id="color"
                type="text"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="e.g. White"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-600"
                required
              />
            </div>

            {error && (
              <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Registering Vehicle..." : "Register Vehicle"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
