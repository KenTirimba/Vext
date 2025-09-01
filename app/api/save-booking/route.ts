import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// helper: generate short code like "42AB"
function generateShortId() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no confusing chars
  const digits = "0123456789";
  let result = "";

  // first two: digits
  for (let i = 0; i < 2; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }

  // last two: letters or digits
  const mixed = letters + digits;
  for (let i = 0; i < 2; i++) {
    result += mixed.charAt(Math.floor(Math.random() * mixed.length));
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const {
      clientId,
      providerId,
      videoId,
      date,
      time,
      total,
      addons,
      clientPhone,
      clientName,
    } = await req.json();

    if (!clientId || !providerId || !videoId || !date || !time || !total) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get provider details
    const providerSnap = await adminDb.collection("users").doc(providerId).get();
    if (!providerSnap.exists) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    const provider = providerSnap.data();

    if (!provider?.businessPhone) {
      return NextResponse.json({ error: "Provider business phone is missing" }, { status: 400 });
    }

    const shortId = generateShortId();

    // Save booking
    const bookingRef = await adminDb.collection("bookings").add({
      clientId,
      providerId,
      videoId,
      date,
      time,
      total,
      addons: addons || [],
      status: "pending",
      createdAt: Date.now(),
      clientPhone: clientPhone || null,
      providerPhone: provider.businessPhone,
      clientName: clientName || "",
      creatorName: provider.fullName || provider.username || "Unknown",
      shortId, // ✅ store memorable ID
    });

    return NextResponse.json({ bookingId: bookingRef.id, shortId }, { status: 200 });
  } catch (err: any) {
    console.error("save-booking error:", err?.message || err);
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}