import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
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

    const email = user.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Authenticated user does not have an email",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No Smart Vehicle account exists for this email address",
        },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        authUserId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Authentication linked successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
    } catch (error) {
    console.error("AUTH SYNC ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to link authentication",
      },
      { status: 500 }
    );
  }
}