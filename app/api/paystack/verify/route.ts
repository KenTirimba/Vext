export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { reference } = await req.json();

  if (!reference) {
    return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
  }

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

  return NextResponse.json({ success: true, data: data.data });
}
