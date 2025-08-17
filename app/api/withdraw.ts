// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { uid, amount, pin } = await request.json();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data() as any;

    // ✅ Verify PIN
    if (!userData.withdrawalPinHash || !bcrypt.compareSync(pin, userData.withdrawalPinHash)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const available: number = userData.wallet?.available || 0;
    const fee = calculateMpesaFee(amount);
    const totalToDeduct = amount + fee;

    if (totalToDeduct > available) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const recipient_code = userData.recipient_code;
    if (!recipient_code) {
      return NextResponse.json({ error: 'No payment recipient configured' }, { status: 400 });
    }

    const reference = uuidv4().replace(/-/g, '');

    // ✅ Initiate transfer with Paystack
    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: totalToDeduct * 100, // Paystack expects kobo (minor units)
        recipient: recipient_code,
        reference,
        reason: 'Service provider withdrawal',
        metadata: {
          uid,
          amount,
          fee,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Transfer initiation failed' }, { status: res.status });
    }

    const transferCode = data.data.transfer_code;

    // ✅ Save withdrawal request immediately
    const batch = writeBatch(db);

    batch.update(userRef, { 'wallet.available': available - totalToDeduct });

    const withdrawalRef = doc(db, `users/${uid}/withdrawals`, reference);
    batch.set(withdrawalRef, {
      amount,
      fee,
      total: totalToDeduct,
      method: 'mpesa',
      status: 'pending',
      reference,
      transferCode,
      createdAt: Timestamp.now(),
    });

    await batch.commit();

    return NextResponse.json({ transferCode, reference }, { status: 200 });
  } catch (err: any) {
    console.error('Withdraw API Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

function calculateMpesaFee(amount: number): number {
  // ✅ M-PESA Paystack withdrawal fees
  if (amount <= 1500) return 20;
  if (amount <= 20000) return 40;
  if (amount <= 40000) return 140;
  if (amount <= 999999) return 180;
  return 350;
}
