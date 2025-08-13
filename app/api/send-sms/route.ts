// app/api/send-sms/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import africastalking from 'africastalking';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { to?: string | string[]; message?: string };

    if (!body?.to || !body?.message) {
      return NextResponse.json({ error: '`to` and `message` are required' }, { status: 400 });
    }

    const username = process.env.AFRICASTALKING_USERNAME;
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const from = process.env.AFRICASTALKING_FROM;

    if (!username || !apiKey) {
      console.error('Africa\'s Talking credentials missing');
      return NextResponse.json({ error: 'Africa\'s Talking credentials not configured' }, { status: 500 });
    }

    const AT = africastalking({ apiKey, username });
    const sms = AT.SMS;

    const to = Array.isArray(body.to) ? body.to.join(',') : body.to;

    const smsPayload: Record<string, string> = {
      to,
      message: body.message,
    };

    if (from) {
      smsPayload.from = from;
    }

    const response = await sms.send(smsPayload);

    // Africa's Talking returns { SMSMessageData: { Recipients: [...] } }
    const recipients = response?.SMSMessageData?.Recipients || [];

    if (recipients.length === 0) {
      console.error('SMS not accepted by Africa\'s Talking:', response);
      return NextResponse.json({ error: 'SMS sending failed — no recipients accepted' }, { status: 500 });
    }

    // Check if any recipient has a status other than "Success"
    const failedRecipients = recipients.filter(
      (r: any) => r.status !== 'Success'
    );

    if (failedRecipients.length > 0) {
      console.error('Some SMS deliveries failed:', failedRecipients);
      return NextResponse.json(
        { error: 'Some messages were not delivered', details: failedRecipients },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, result: recipients }, { status: 200 });
  } catch (err: any) {
    console.error('send-sms error:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
