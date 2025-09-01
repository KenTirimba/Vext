// /workspaces/Vext/app/api/mpesa/init/route.ts
import { NextRequest, NextResponse } from "next/server";

function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return cleaned;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📲 STK Push request received:", body);

    const { phoneNumber, amount, accountReference, description } = body;

    if (!phoneNumber || !amount) {
      return NextResponse.json(
        { error: "Missing phoneNumber or amount" },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const sanitizedPhone = sanitizePhone(phoneNumber);

    // 🔐 Generate access token from Daraja
    const consumerKey = process.env.MPESA_CONSUMER_KEY!;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
    const shortcode = process.env.MPESA_EXPRESS_BUSINESS_SHORTCODE!;
    const passkey = process.env.MPESA_EXPRESS_PASSKEY!;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;
    if (!callbackUrl) {
      return NextResponse.json(
        { error: "Missing MPESA_CALLBACK_URL. Please set it in .env.local" },
        { status: 500 }
      );
    }

    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const tokenRes = await fetch(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        method: "GET",
        headers: { Authorization: `Basic ${auth}` },
      }
    );

    const tokenData = await tokenRes.json();
    console.log("🔑 M-PESA Access Token:", tokenData);

    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Failed to obtain access token", details: tokenData },
        { status: 500 }
      );
    }

    const accessToken = tokenData.access_token;

    // 🔑 Prepare STK Push payload
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:\.Z]/g, "")
      .slice(0, 14);

    const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: parsedAmount,
      PartyA: sanitizedPhone,
      PartyB: shortcode,
      PhoneNumber: sanitizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference || "VextApp",
      TransactionDesc: description || "Payment",
    };

    console.log("📦 STK Payload:", stkPayload);

    // 🚀 Trigger STK Push
    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    const stkData = await stkRes.json();
    console.log("📡 M-PESA STK Response:", stkData);

    return NextResponse.json(stkData, { status: 200 });
  } catch (error) {
    console.error("❌ Error in /api/mpesa/init:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as any).message },
      { status: 500 }
    );
  }
}