'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import paystackFeeRates from '@/lib/paystackFeeRates';
import SetWithdrawalPin from './SetWithdrawalPin';

interface WithdrawModalProps {
  available: number;
  onClose: () => void;
}

export default function WithdrawModal({ available, onClose }: WithdrawModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<'bank' | 'mobile'>('bank');
  const [fee, setFee] = useState<number>(0);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setAmount(val);
    setFee(paystackFeeRates.getTransferFee('KENYA', method, val));
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
        method,
        pin
      })
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

        <label className="block mb-2">Method</label>
        <select
          value={method}
          onChange={e => setMethod(e.target.value as 'bank' | 'mobile')}
          className="w-full border rounded px-3 py-2 mb-4"
        >
          <option value="bank">Bank Transfer</option>
          <option value="mobile">Mobile Money</option>
        </select>

        <p className="mb-4">Estimated Fee: KSHS {fee}</p>
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

        <p className="mt-4 text-sm">
          Don’t have a PIN?{' '}
          <button onClick={() => setShowPinSetup(true)} className="text-blue-600 underline">
            Set up PIN
          </button>
        </p>

        {showPinSetup && <SetWithdrawalPin />}
      </div>
    </div>
  );
}
