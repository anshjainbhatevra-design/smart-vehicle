import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication — same Bearer-token pattern as all owner routes
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

    // 3. Find the corresponding Prisma user
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

    // 4. Parse and validate the endpoint from the request body
    const body = await request.json();
    const { endpoint } = body as { endpoint?: string };

    if (!endpoint) {
      return NextResponse.json(
        {
          success: false,
          message: "endpoint is required",
        },
        { status: 400 }
      );
    }

    // 5. Find the subscription and verify it belongs to this user
    //    before deleting — prevents one user from unsubscribing another.
    const existing = await prisma.pushSubscription.findUnique({
      where: {
        endpoint,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!existing) {
      // Already gone — treat as success (idempotent)
      return NextResponse.json({
        success: true,
        message: "Subscription not found (already removed)",
      });
    }

    if (existing.userId !== prismaUser.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to remove this subscription",
        },
        { status: 403 }
      );
    }

    await prisma.pushSubscription.delete({
      where: {
        endpoint,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Push subscription removed",
    });
  } catch (error) {
    console.error("Push unsubscribe error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while removing the push subscription",
      },
      { status: 500 }
    );
  }
}
