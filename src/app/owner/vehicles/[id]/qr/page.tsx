"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

export default function VehicleQRPage() {
  const params = useParams();
  const router = useRouter();

  const vehicleId = params.id as string;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadVehicle() {
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
          setError(data.message || "Unable to load vehicle.");
          return;
        }

        const foundVehicle = data.vehicles.find(
          (item: Vehicle) => item.id === vehicleId
        );

        if (!foundVehicle) {
          setError("Vehicle not found.");
          return;
        }

        setVehicle(foundVehicle);
      } catch (error) {
        console.error("Vehicle QR error:", error);
        setError("Unable to load vehicle.");
      } finally {
        setLoading(false);
      }
    }

    loadVehicle();
  }, [vehicleId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading QR code...</p>
      </main>
    );
  }

  if (error || !vehicle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-red-600">
            {error || "Vehicle not found."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/owner/vehicles")}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to My Vehicles
          </button>
        </div>
      </main>
    );
  }

  if (!vehicle.qrCode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-5">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-700">
            No QR code is assigned to this vehicle.
          </p>

          <button
            type="button"
            onClick={() => router.push("/owner/vehicles")}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
          >
            Back to My Vehicles
          </button>
        </div>
      </main>
    );
  }

  const qrImageUrl = `/api/qr/image?token=${encodeURIComponent(
    vehicle.qrCode.token
  )}`;

  return (
    <main className="min-h-screen bg-gray-50 px-5 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() => router.push("/owner/vehicles")}
            className="mb-5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ← Back to My Vehicles
          </button>

          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Smart Vehicle
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Vehicle QR Code
          </h1>

          <p className="mt-2 text-gray-600">
            Scan this QR code to contact the vehicle owner.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            {vehicle.registrationNumber}
          </h2>

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

          <div className="mx-auto mt-6 flex justify-center rounded-2xl border border-gray-200 bg-white p-5">
            <img
              src={qrImageUrl}
              alt={`QR code for ${vehicle.registrationNumber}`}
              className="h-72 w-72"
            />
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Anyone who scans this QR code can send an alert to you.
          </p>
        </section>
      </div>
    </main>
  );
}