import { NextRequest, NextResponse } from "next/server";
import { sendB2C } from "@/lib/mpesa";

export async function POST(req: NextRequest) {
  try {
    const { phone, amount } = await req.json();

    if (!phone || !amount) {
      return NextResponse.json({ error: "Missing phone or amount" }, { status: 400 });
    }

    const result = await sendB2C({ phone, amount });
    console.log("B2C Response:", result);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("B2C Error:", error.response?.data || error.message);
    return NextResponse.json({ error: "B2C request failed" }, { status: 500 });
  }
}
