// app/api/save-booking/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { addDoc, collection } from 'firebase/firestore';

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
      providerPhone,
      clientName,
      creatorName,
    } = await req.json();

    if (!clientId || !providerId || !videoId || !date || !time || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save booking to Firestore as pending until payment confirmation
    const bookingRef = await addDoc(collection(db, 'bookings'), {
      clientId,
      providerId,
      videoId,
      date,
      time,
      total,
      addons,
      status: 'pending', // Will be updated to "confirmed" after payment success
      createdAt: Date.now(),
      clientPhone,
      providerPhone,
      clientName,
      creatorName,
    });

    return NextResponse.json({ bookingId: bookingRef.id }, { status: 200 });
  } catch (err: any) {
    console.error('save-booking error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}