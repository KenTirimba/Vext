export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import africastalking from 'africastalking';

const AT = africastalking({
  apiKey: process.env.AFRICASTALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

const sms = AT.SMS;

export async function POST(req: NextRequest) {
  const { to, message } = await req.json();

  if (!to || !message) {
    return NextResponse.json({ error: 'Missing `to` or `message`' }, { status: 400 });
  }

  try {
    const result = await sms.send({
      to,
      from: process.env.AFRICASTALKING_FROM!,
      message,
    });

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
