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

    // 4. Parse and validate the push subscription from the request body
    const body = await request.json();

    const { endpoint, keys } = body as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        {
          success: false,
          message: "endpoint, keys.p256dh, and keys.auth are required",
        },
        { status: 400 }
      );
    }

    // 5. Upsert the subscription — update if the endpoint already exists,
    //    create if it is new. This makes re-subscribing fully idempotent.
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint,
      },
      update: {
        userId: prismaUser.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        userId: prismaUser.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push subscription saved",
        subscriptionId: subscription.id,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Push subscribe error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while saving the push subscription",
      },
      { status: 500 }
    );
  }
}
