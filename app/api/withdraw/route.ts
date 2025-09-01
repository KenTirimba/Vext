// /workspaces/Vext/app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";

const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY!;
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET!;
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE!; // Paybill or Till number
const DARAJA_INITIATOR = process.env.DARAJA_INITIATOR!;
const DARAJA_SECURITY_CREDENTIAL = process.env.DARAJA_SECURITY_CREDENTIAL!; // Encrypted password
const DARAJA_ENV = process.env.DARAJA_ENV || "sandbox"; // "sandbox" or "production"

const BASE_URL =
  DARAJA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`
  ).toString("base64");

  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Daraja access token");
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Withdraw request received:", body);

    const { name, phoneNumber, amount } = body;

    if (!name || !phoneNumber || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 }
      );
    }

    // ✅ Get access token
    const token = await getAccessToken();

    // ✅ Prepare B2C request
    const payload = {
      InitiatorName: DARAJA_INITIATOR,
      SecurityCredential: DARAJA_SECURITY_CREDENTIAL,
      CommandID: "BusinessPayment", // Could be SalaryPayment, PromotionPayment, etc
      Amount: parsedAmount,
      PartyA: DARAJA_SHORTCODE,
      PartyB: phoneNumber,
      Remarks: "Withdrawal Request",
      QueueTimeOutURL: "https://reimagined-yodel-979j646xwrjvcx74r-3000.app.github.dev/api/withdraw-timeout", // update with your URL
      ResultURL: "https://reimagined-yodel-979j646xwrjvcx74r-3000.app.github.dev/api/withdraw-callback", // update with your URL
      Occasion: "Withdrawal",
    };

    console.log("Sending payload to Daraja:", payload);

    const res = await fetch(`${BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const darajaResponse = await res.json();
    console.log("Daraja API Response:", darajaResponse);

    return NextResponse.json(
      {
        success: true,
        message: "Withdrawal request submitted",
        darajaResponse,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in withdraw API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}