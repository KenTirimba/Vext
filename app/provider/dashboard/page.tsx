'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import WithdrawModal from '@/components/WithdrawModal';
import WithdrawalHistory from '@/components/WithdrawalHistory';

export default function ProviderDashboard() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    // ✅ Real-time listener for wallet balance
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setBalance(data.wallet?.available || 0);
      }
      setLoading(false);
    });

    return () => unsubscribe(); // cleanup on unmount
  }, [user]);

  if (!user) return <p className="p-6">Please sign in to view this page.</p>;
  if (loading) return <p className="p-6">Loading balance…</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>

      {/* Wallet balance */}
      <div className="p-4 bg-white shadow rounded mb-4">
        <h2 className="font-semibold">Available Balance</h2>
        <p className="text-xl">KSH {balance}</p>
      </div>

      {/* Withdraw funds button */}
      <button
        onClick={() => setShowWithdraw(true)}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Withdraw Funds
      </button>

      {/* Withdraw modal */}
      {showWithdraw && (
        <WithdrawModal
          available={balance}
          onClose={() => setShowWithdraw(false)}
          onWithdrawSuccess={() => {}} // no need anymore, real-time sync
        />
      )}

      {/* Withdrawal history table */}
      <WithdrawalHistory />
    </div>
  );
}