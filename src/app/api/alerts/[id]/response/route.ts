import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Alert ID is required",
        },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: {
        id,
      },
      include: {
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

    if (!alert.response) {
      return NextResponse.json({
        success: true,
        responded: false,
        response: null,
      });
    }

    return NextResponse.json({
      success: true,
      responded: true,
      response: {
        message: alert.response.message,
        createdAt: alert.response.createdAt,
      },
    });
  } catch (error) {
    console.error("Fetch alert response error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while fetching the response",
      },
      { status: 500 }
    );
  }
}
