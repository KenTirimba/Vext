// app/api/paystack/verify/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  const { reference, bookingId } = await req.json();

  if (!reference || !bookingId) {
    return NextResponse.json({ error: 'Missing reference or bookingId' }, { status: 400 });
  }

  // Verify payment with Paystack
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || data.data.status !== 'success') {
    return NextResponse.json({ error: data.message }, { status: 400 });
  }

  // Update booking to confirmed
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, { status: 'confirmed', paymentReference: reference });

  // Fetch booking details for SMS
  const bookingSnap = await getDoc(bookingRef);
  const bookingData = bookingSnap.data();

  if (bookingData?.providerPhone) {
    const firstName = (bookingData.clientName || '').split(' ').filter(Boolean)[0] || 'Client';
    const bookingLink = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/bookings/${bookingId}`;
    const dateStr = new Date(bookingData.date).toDateString();
    const timeStr = bookingData.time || '';

    // Send SMS to provider
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: bookingData.providerPhone,
        message: `Hi ${bookingData.creatorName || 'Provider'}, you have a new booking (Order #${bookingId}) from ${firstName} on ${dateStr} at ${timeStr}. Please accept or reject here: ${bookingLink}`,
      }),
    });
  }

  return NextResponse.json({ success: true, data: data.data });
}
