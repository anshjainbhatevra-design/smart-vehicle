"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string | null;
  model: string | null;
  color: string | null;
  qrCode: {
    token: string;
  } | null;
};

export default function MyVehiclesPage() {
  const router = useRouter();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVehicles() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch("/api/owner/vehicles", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Unable to load vehicles.");
          return;
        }

        setVehicles(data.vehicles);
      } catch (error) {
        console.error("Vehicles error:", error);
        setError("Unable to load your vehicles.");
      } finally {
        setLoading(false);
      }
    }

    loadVehicles();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your vehicles...</p>
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
              My Vehicles
            </h1>

            <p className="mt-2 text-gray-600">
              Manage your registered vehicles.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/owner/vehicles/register")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add Vehicle
            </button>

            <button
              type="button"
              onClick={() => router.push("/owner/dashboard")}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {vehicles.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">
              You don't have any vehicles registered yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <section
                key={vehicle.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {vehicle.registrationNumber}
                    </p>

                    <p className="mt-1 text-gray-600">
                      {[vehicle.make, vehicle.model]
                        .filter(Boolean)
                        .join(" ") || "Vehicle"}
                    </p>

                    {vehicle.color && (
                      <p className="mt-1 text-sm text-gray-500">
                        Color: {vehicle.color}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Active
                  </span>
                </div>

                <div className="mt-5 flex gap-3">
                  {vehicle.qrCode && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/owner/vehicles/${vehicle.id}/qr`)
                      }
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      View QR Page
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}