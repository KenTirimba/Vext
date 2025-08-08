export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, amount } = await req.json();

  if (!email || !amount) {
    return NextResponse.json({ error: 'Missing email or amount' }, { status: 400 });
  }

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: amount * 100,
      currency: 'KES',
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.message }, { status: res.status });
  }

  return NextResponse.json({
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  });
}
