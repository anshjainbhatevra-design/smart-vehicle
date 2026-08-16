import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    // 4. Optional ownerId from the URL
    const { searchParams } = new URL(request.url);
    const requestedOwnerId = searchParams.get("ownerId");

    // If ownerId is supplied, it MUST match the authenticated owner.
    if (requestedOwnerId && requestedOwnerId !== prismaUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have access to these alerts",
        },
        { status: 403 }
      );
    }

    // 5. Always use the authenticated owner's ID
    const ownerId = prismaUser.id;

    // 6. Fetch only this owner's alerts
    const alerts = await prisma.alert.findMany({
      where: {
        vehicle: {
          ownerId,
        },
      },
      include: {
        vehicle: true,
        response: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error("Owner alerts error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching alerts",
      },
      { status: 500 }
    );
  }
}