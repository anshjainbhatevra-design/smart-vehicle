import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    // 1. Get the logged-in user's access token
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

    // 2. Verify the Supabase user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
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

    // 3. Find the corresponding Smart Vehicle user
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

    // 4. Read vehicle details
    const body = await request.json();

    const {
      registrationNumber,
      make,
      model,
      color,
    } = body;

    if (
      !registrationNumber?.trim() ||
      !make?.trim() ||
      !model?.trim() ||
      !color?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Registration number, make, model and color are required",
        },
        { status: 400 }
      );
    }

    // 5. Normalize registration number
    const normalizedRegistrationNumber =
      registrationNumber.trim().toUpperCase();

    // 6. Check whether vehicle already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: {
        registrationNumber: normalizedRegistrationNumber,
      },
    });

    if (existingVehicle) {
      return NextResponse.json(
        {
          success: false,
          message: "A vehicle with this registration number already exists",
        },
        { status: 409 }
      );
    }

    // 7. Generate a unique QR token
    const token = crypto.randomBytes(32).toString("hex");

    // 8. Create the vehicle and QR code together
    const vehicle = await prisma.vehicle.create({
      data: {
        ownerId: prismaUser.id,
        registrationNumber: normalizedRegistrationNumber,
        make: make?.trim() || null,
        model: model?.trim() || null,
        color: color?.trim() || null,

        qrCode: {
          create: {
            token,
            isActive: true,
          },
        },
      },
      include: {
        qrCode: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Vehicle and QR code registered successfully",
        vehicle,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Vehicle registration error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while registering the vehicle",
      },
      { status: 500 }
    );
  }
}
