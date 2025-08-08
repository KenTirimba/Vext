// app/api/paystack-webhook/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

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
  const {
    reference,
    status,
  } = body.data;

  // Successful transfer: update withdrawal status in Firestore
  if (event === 'transfer.success') {
    const { uid } = body.data.metadata || {};
    if (uid) {
      const wRef = doc(db, `users/${uid}/withdrawals`, reference);
      await updateDoc(wRef, { status: 'success' });
      return NextResponse.json({ received: true });
    }
  }

  // Transfer failed: mark appropriately
  if (event === 'transfer.failed') {
    const { uid } = body.data.metadata || {};
    if (uid) {
      const wRef = doc(db, `users/${uid}/withdrawals`, reference);
      await updateDoc(wRef, { status: 'failed' });
      return NextResponse.json({ received: true });
    }
  }

  // Acknowledge other events
  return NextResponse.json({ received: true });
}
