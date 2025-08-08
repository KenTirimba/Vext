// components/SetWithdrawalPin.tsx
'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

export default function SetWithdrawalPin() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSave = async () => {
    if (pin.length < 4 || pin !== confirmPin) return alert('PINs must match and be at least 4 digits.');
    const hash = await bcrypt.hash(pin, 10);
    await updateDoc(doc(db, 'users', auth.currentUser!.uid), { withdrawalPinHash: hash });
    alert('PIN set successfully');
    setPin(''); setConfirmPin('');
  };

  return (
    <div>
      <h3>Set Withdrawal PIN</h3>
      <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Enter PIN" />
      <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="Confirm PIN" />
      <button onClick={handleSave}>Save PIN</button>
    </div>
  );
}
