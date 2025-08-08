// app/api/send-sms/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import africastalking from 'africastalking';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { to?: string; message?: string };

    if (!body?.to || !body?.message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 });
    }

    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;

    if (!username || !apiKey) {
      return NextResponse.json({ error: 'Africa\'s Talking credentials not configured' }, { status: 500 });
    }

    // initialize africastalking
    const AT = africastalking({
      apiKey,
      username,
    });

    const sms = AT.SMS;

    // africastalking expects a string (comma separated allowed). ensure string
    const to = Array.isArray(body.to) ? body.to.join(',') : body.to;

    const response = await sms.send({
      to,
      message: body.message,
      // from: 'Vext' // optional sender id (if configured in AT account)
    });

    // return provider response (be careful not to leak secrets in real production)
    return NextResponse.json({ ok: true, result: response }, { status: 200 });
  } catch (err: any) {
    console.error('send-sms error', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}