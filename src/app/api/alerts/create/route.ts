import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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