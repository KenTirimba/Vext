// File: /app/api/withdraw/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { uid, amount, method, pin } = await request.json();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data() as any;

    // Verify PIN
    if (!userData.withdrawalPinHash || !bcrypt.compareSync(pin, userData.withdrawalPinHash)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const available: number = userData.wallet?.available || 0;
    const fee = calculatePaystackFee(method, amount);
    const totalToDeduct = amount + fee;

    if (totalToDeduct > available) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    const recipient_code = userData.recipient_code;
    if (!recipient_code) {
      return NextResponse.json({ error: 'No payment recipient configured' }, { status: 400 });
    }

    const reference = uuidv4().replace(/-/g, '');
    // Initiate transfer with Paystack
    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: totalToDeduct,
        recipient: recipient_code,
        reference,
        reason: 'Service provider withdrawal',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.message || 'Transfer initiation failed' }, { status: res.status });
    }

    const transferCode = data.data.transfer_code;

    // Update Firestore atomically
    const batch = writeBatch(db);
    batch.update(userRef, { 'wallet.available': available - totalToDeduct });

    const withdrawalRef = doc(db, `users/${uid}/withdrawals`, uuidv4());
    batch.set(withdrawalRef, {
      amount,
      fee,
      net: amount - fee,
      method,
      status: data.data.status,
      reference,
      transferCode,
      createdAt: Timestamp.now(),
    });

    await batch.commit();

    return NextResponse.json({ transferCode }, { status: 200 });
  } catch (err: any) {
    console.error('Withdraw API Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

function calculatePaystackFee(method: string, amount: number): number {
  // Modify logic per your fee structure
  if (method === 'mobile') {
    if (amount <= 1500) return 20;
    if (amount <= 20000) return 40;
    return 60;
  } else {
    return 80;
  }
}
