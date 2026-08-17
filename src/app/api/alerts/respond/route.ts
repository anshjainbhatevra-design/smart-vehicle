import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

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

    // 4. Read request body
    const body = await request.json();

    const { alertId, message } = body;

    if (!alertId || !message?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Alert ID and response message are required",
        },
        { status: 400 }
      );
    }

    // 5. Find alert
    const alert = await prisma.alert.findUnique({
      where: {
        id: alertId,
      },
      include: {
        vehicle: true,
        response: true,
      },
    });

    if (!alert) {
      return NextResponse.json(
        {
          success: false,
          message: "Alert not found",
        },
        { status: 404 }
      );
    }

    // 6. Verify that the authenticated user owns the vehicle
    if (alert.vehicle.ownerId !== prismaUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to respond to this alert",
        },
        { status: 403 }
      );
    }

    // 7. Prevent multiple responses
    if (alert.response) {
      return NextResponse.json(
        {
          success: false,
          message: "This alert already has a response",
        },
        { status: 409 }
      );
    }

    // 8. Create response
    const response = await prisma.alertResponse.create({
      data: {
        alertId,
        message: message.trim(),
      },
    });

    // 9. Update alert status
    await prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        status: "RESPONDED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Response sent successfully",
        response,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Alert response error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while responding to the alert",
      },
      { status: 500 }
    );
  }
}
