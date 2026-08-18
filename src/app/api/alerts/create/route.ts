import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/web-push";

// Returns a human-readable notification body for each alert type.
function getAlertBody(
  type: string,
  registrationNumber: string,
  extraMessage: string | null
): string {
  const suffix =
    extraMessage ? ` Message: "${extraMessage}"` : "";

  switch (type) {
    case "BLOCKING":
      return `Someone reported that your vehicle ${registrationNumber} is blocking their way.${suffix}`;
    case "LIGHTS_ON":
      return `Your vehicle ${registrationNumber} may have its lights left on.${suffix}`;
    case "VEHICLE_ISSUE":
      return `Someone reported an issue with your vehicle ${registrationNumber}.${suffix}`;
    case "EMERGENCY":
      return `Emergency alert regarding your vehicle ${registrationNumber}.${suffix}`;
    case "OTHER":
    default:
      return `You received a new alert regarding your vehicle ${registrationNumber}.${suffix}`;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      token,
      type,
      message,
      scannerName,
    } = body;

    if (!token || !type) {
      return NextResponse.json(
        {
          success: false,
          message: "QR token and alert type are required",
        },
        { status: 400 }
      );
    }

    const validTypes = [
      "BLOCKING",
      "LIGHTS_ON",
      "VEHICLE_ISSUE",
      "EMERGENCY",
      "OTHER",
    ];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid alert type",
        },
        { status: 400 }
      );
    }

    const qrCode = await prisma.qRCode.findUnique({
      where: {
        token,
      },
      include: {
        vehicle: true,
      },
    });

    if (!qrCode || !qrCode.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or inactive QR code",
        },
        { status: 404 }
      );
    }

    const alert = await prisma.alert.create({
      data: {
        vehicleId: qrCode.vehicleId,
        type,
        message: message?.trim() || null,
        scannerName: scannerName?.trim() || null,
      },
    });

    // ── Push notification delivery ──────────────────────────────────────────
    // Fire-and-forget: push failure MUST NOT fail the alert response.
    // The alert is already saved above; this is best-effort delivery.
    void (async () => {
      try {
        const ownerId = qrCode.vehicle.ownerId;
        const registrationNumber = qrCode.vehicle.registrationNumber;

        const subscriptions = await prisma.pushSubscription.findMany({
          where: { userId: ownerId },
        });

        if (subscriptions.length === 0) return;

        const notificationBody = getAlertBody(
          type,
          registrationNumber,
          message?.trim() || null
        );

        const payload = {
          title: "🚗 Smart Vehicle Alert",
          body: notificationBody,
          url: "/owner/dashboard",
        };

        const expiredEndpoints: string[] = [];

        await Promise.allSettled(
          subscriptions.map(async (sub) => {
            try {
              const delivered = await sendPushNotification(sub, payload);
              if (!delivered) {
                // Subscription is expired or invalid — queue for cleanup
                expiredEndpoints.push(sub.endpoint);
              }
            } catch (pushError) {
              console.error(
                "Push send error for endpoint",
                sub.endpoint,
                pushError
              );
            }
          })
        );

        // Clean up expired subscriptions
        if (expiredEndpoints.length > 0) {
          await prisma.pushSubscription.deleteMany({
            where: { endpoint: { in: expiredEndpoints } },
          }).catch((err) =>
            console.error("Failed to clean expired subscriptions:", err)
          );
        }
      } catch (err) {
        console.error("Push notification block error:", err);
      }
    })();
    // ───────────────────────────────────────────────────────────────────────

    return NextResponse.json(
      {
        success: true,
        message: "Alert sent successfully",
        alert,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Alert creation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while creating the alert",
      },
      { status: 500 }
    );
  }
}