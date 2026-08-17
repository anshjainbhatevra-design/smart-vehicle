import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication token missing",
        },
        { status: 401 }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");

    // 2. Verify Supabase user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired authentication",
        },
        { status: 401 }
      );
    }

    // 3. Find Smart Vehicle user
    const prismaUser = await prisma.user.findUnique({
      where: {
        authUserId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!prismaUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account is not linked to Smart Vehicle",
        },
        { status: 404 }
      );
    }

    // 4. Read vehicle ID
    const body = await request.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle ID is required",
        },
        { status: 400 }
      );
    }

    // 5. Find vehicle AND verify ownership
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        ownerId: prismaUser.id,
      },
      include: {
        qrCode: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle not found or you do not have access to it",
        },
        { status: 404 }
      );
    }

    // 6. Don't create duplicate QR
    if (vehicle.qrCode) {
      return NextResponse.json({
        success: true,
        message: "QR code already exists for this vehicle",
        qrCode: vehicle.qrCode,
      });
    }

    // 7. Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");

    // 8. Create QR code
    const qrCode = await prisma.qRCode.create({
      data: {
        vehicleId: vehicle.id,
        token,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "QR code generated successfully",
        qrCode,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("QR generation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while generating the QR code",
      },
      { status: 500 }
    );
  }
}
