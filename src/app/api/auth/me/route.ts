import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
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

    // First try to find the user using Supabase Auth ID
    let prismaUser = await prisma.user.findUnique({
      where: {
        authUserId: user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        authUserId: true,
      },
    });

    // If authUserId is not linked yet, find the Smart Vehicle
    // account using the authenticated email and link it.
    if (!prismaUser) {
      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          authUserId: true,
        },
      });

      if (!existingUser) {
        return NextResponse.json(
          {
            success: false,
            message: "No Smart Vehicle account exists for this email address",
          },
          { status: 404 }
        );
      }

      prismaUser = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          authUserId: user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          authUserId: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: prismaUser,
    });
  } catch (error) {
    console.error("Auth me error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to identify current user",
      },
      { status: 500 }
    );
  }
}
