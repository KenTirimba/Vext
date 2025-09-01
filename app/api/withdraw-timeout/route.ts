import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    console.log("Withdraw Timeout received:", data);

    // TODO: Update DB to mark transaction as "timed out"

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Timeout handled" });
  } catch (err: any) {
    console.error("Withdraw Timeout error:", err);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: "Timeout processing error" },
      { status: 500 }
    );
  }
}
