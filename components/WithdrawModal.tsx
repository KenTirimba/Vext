'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';

interface WithdrawModalProps {
  available: number;
  onClose: () => void;
}

export default function WithdrawModal({ available, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [fee, setFee] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const calculateFee = (val: number): number => {
    if (val <= 1500) return 20;
    if (val <= 20000) return 40;
    if (val <= 40000) return 140;
    if (val <= 999999) return 180;
    return 350;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val);
    setFee(calculateFee(val));
  };

  const handleSubmit = async () => {
    if (!pin) return alert('Enter PIN');
    if (amount + fee > available) return alert('Insufficient balance');
    setLoading(true);

    const res = await fetch('/api/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: auth.currentUser!.uid,
        amount,
        pin,
      }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) return alert(data.error || 'Withdrawal failed');
    alert('Your withdrawal request has been submitted.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded w-[90vw] max-w-md">
        <button onClick={onClose} className="text-xl float-right">×</button>
        <h2 className="text-lg font-bold mb-4">Withdraw Funds</h2>

        <label className="block mb-2">Amount (max: {available})</label>
        <input
          type="number"
          value={amount}
          onChange={handleAmountChange}
          className="w-full border rounded px-3 py-2 mb-4"
          min={1}
          max={available}
        />

        <p className="mb-2">M-PESA Withdrawal</p>
        <p className="mb-2">Fee: KSHS {fee}</p>
        <p className="mb-4 font-semibold">Total Deducted: KSHS {amount + fee}</p>

        <label className="block mb-2">PIN</label>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? 'Processing...' : 'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );
}