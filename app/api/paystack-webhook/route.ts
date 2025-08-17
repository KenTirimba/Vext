// app/api/paystack-webhook/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, increment } from 'firebase/firestore';

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get('x-paystack-signature') || '';
  const secret = process.env.PAYSTACK_SECRET_KEY || '';
  const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');

  if (sig !== hash) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const body = JSON.parse(payload);
  const event = body.event;
  const { reference, status, metadata } = body.data;

  // ✅ Booking payment success
  if (event === 'charge.success' && status === 'success') {
    const bookingId = metadata?.bookingId;
    if (bookingId) {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, { status: 'confirmed', paymentReference: reference });

      // Fetch booking details
      const bookingSnap = await getDoc(bookingRef);
      const bookingData = bookingSnap.data();

      // Send SMS to provider
      if (bookingData?.providerPhone) {
        const firstName = (bookingData.clientName || '').split(' ').filter(Boolean)[0] || 'Client';
        const bookingLink = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/bookings/${bookingId}`;
        const dateStr = new Date(bookingData.date).toDateString();
        const timeStr = bookingData.time || '';

        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: bookingData.providerPhone,
            message: `Hi ${bookingData.creatorName || 'Provider'}, you have a new booking (Order #${bookingId}) from ${firstName} on ${dateStr} at ${timeStr}. Please accept or reject here: ${bookingLink}`,
          }),
        });
      }
    }
  }

  // ✅ Withdrawal success
  if (event === 'transfer.success') {
    const { uid } = metadata || {};
    if (uid) {
      const wRef = doc(db, `users/${uid}/withdrawals`, reference);
      await updateDoc(wRef, { status: 'success', completedAt: new Date() });
    }
  }

  // ❌ Withdrawal failed → refund wallet
  if (event === 'transfer.failed') {
    const { uid, amount, fee } = metadata || {};
    if (uid) {
      const wRef = doc(db, `users/${uid}/withdrawals`, reference);
      await updateDoc(wRef, { status: 'failed', failedAt: new Date() });

      // Refund wallet
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        'wallet.available': increment(amount + fee), // refund full deducted amount
      });
    }
  }

  return NextResponse.json({ received: true });
}