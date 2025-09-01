import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("Withdraw Callback received:", data);

    // TODO: Save success status in DB
    // Example: mark transaction as successful

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (err: any) {
    console.error("Withdraw Callback error:", err);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Callback processing error" },
      { status: 500 }
    );
  }
}
