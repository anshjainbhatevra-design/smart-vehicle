import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { token } = await params;

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

    return NextResponse.json({
      success: true,
      vehicle: {
        registrationNumber: qrCode.vehicle.registrationNumber,
        make: qrCode.vehicle.make,
        model: qrCode.vehicle.model,
        color: qrCode.vehicle.color,
      },
    });
  } catch (error) {
    console.error("Scan API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load vehicle information",
      },
      { status: 500 }
    );
  }
}