import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Capture raw body for debugging
    const rawBody = await req.text();
    console.log("📩 Raw Callback Body:", rawBody);

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("❌ Failed to parse JSON body:", e);
      return NextResponse.json(
        { error: "Invalid JSON in callback" },
        { status: 400 }
      );
    }

    // Log headers for verification
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("📑 Callback Headers:", JSON.stringify(headers, null, 2));

    // Safaricom sends different structures for STK Push vs B2C
    if (body?.Body?.stkCallback) {
      console.log("📲 STK Push Callback:", JSON.stringify(body, null, 2));
    } else if (body?.Result) {
      console.log("💸 B2C Callback:", JSON.stringify(body, null, 2));
    } else {
      console.log("ℹ️ Unknown Callback Structure:", JSON.stringify(body, null, 2));
    }

    // TODO: Save transaction status/result into Firestore or DB here

    return NextResponse.json({ message: "Callback received" });
  } catch (error) {
    console.error("❌ Callback Error:", error);
    return NextResponse.json(
      { error: "Failed to process callback" },
      { status: 500 }
    );
  }
}