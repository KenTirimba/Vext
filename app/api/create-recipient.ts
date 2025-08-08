// pages/api/create-recipient.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import fetch from 'node-fetch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type, name, account_number, bank_code, currency } = req.body;

  const response = await fetch('https://api.paystack.co/transferrecipient', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, name, account_number, bank_code, currency }),
  });

  const data: any = await response.json();
  if (!response.ok) return res.status(response.status).json({ error: data.message });
  return res.status(200).json({ recipient_code: data.data.recipient_code });
}
