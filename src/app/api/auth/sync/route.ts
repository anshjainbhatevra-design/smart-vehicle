import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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

    /*
     * Check whether this Supabase user is already linked
     * to a Smart Vehicle account.
     */
    const linkedUser = await prisma.user.findUnique({
      where: {
        authUserId: user.id,
      },
    });

    if (linkedUser) {
      return NextResponse.json({
        success: true,
        message: "Authentication linked successfully",
        user: {
          id: linkedUser.id,
          name: linkedUser.name,
          email: linkedUser.email,
          role: linkedUser.role,
        },
      });
    }

    /*
     * Check whether a Smart Vehicle account already exists
     * for this email.
     */
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    /*
     * Existing Smart Vehicle user:
     * link the Supabase Auth user to it.
     */
    if (existingUser) {
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
    }

    /*
     * New email:
     * automatically create a Smart Vehicle account.
     *
     * Magic-link authentication is handled by Supabase,
     * so passwordHash is only a placeholder required by
     * the current Prisma schema.
     */
    const newUser = await prisma.user.create({
      data: {
        authUserId: user.id,
        email,
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0],
        phone: user.user_metadata?.phone || null,
        passwordHash: `MAGIC_LINK_ONLY_${crypto.randomUUID()}`,
        role: "OWNER",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Smart Vehicle account created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
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