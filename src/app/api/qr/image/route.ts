import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "QR token is required",
        },
        { status: 400 }
      );
    }

    const qrCode = await prisma.qRCode.findUnique({
      where: {
        token,
      },
    });

    if (!qrCode || !qrCode.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or inactive QR code",
        },
        { status: 404 }
      );
    }

    const scanUrl = `${new URL(request.url).origin}/scan/${token}`;

    const qrImage = await QRCode.toDataURL(scanUrl, {
      width: 500,
      margin: 2,
    });

    const base64Data = qrImage.split(",")[1];

    const imageBuffer = Buffer.from(base64Data, "base64");

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("QR image generation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Could not generate QR image",
      },
      { status: 500 }
    );
  }
}