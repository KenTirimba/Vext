'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import WithdrawModal from '@/components/WithdrawModal';
import WithdrawalHistory from '@/components/WithdrawalHistory';
import PayoutSettingsModal from '@/components/PayoutSettingsModal';

export default function ProviderDashboard() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showPayoutSettings, setShowPayoutSettings] = useState(false);
  const [hasPayoutSettings, setHasPayoutSettings] = useState<boolean | null>(null);

  // 🔍 Check if provider has payout settings
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);

    getDoc(userRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.payout_method === "mpesa" && data.payout_phone) {
          setHasPayoutSettings(true);
        } else {
          setHasPayoutSettings(false);
        }
      } else {
        setHasPayoutSettings(false);
      }
    });
  }, [user]);

  // 🔍 Compute balance dynamically from accepted + completed bookings
  useEffect(() => {
    if (!user) return;

    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('providerId', '==', user.uid),
      where('status', 'in', ['accepted', 'completed']) // ✅ include both
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Booking Data:", doc.id, data); // 👀 Debug Firestore results
        total += data.total || 0; // ✅ use "total" field
      });
      console.log("Computed Balance:", total); // 👀 Debug computed balance
      setBalance(total);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) return <p className="p-6">Please sign in to view this page.</p>;
  if (loading) return <p className="p-6">Loading balance…</p>;

  const handleWithdrawClick = () => {
    if (hasPayoutSettings) {
      setShowWithdraw(true);
    } else {
      setShowPayoutSettings(true);
    }
  };

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
        onClick={handleWithdrawClick}
        className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Withdraw Funds
      </button>

      {/* Withdraw modal — ✅ only render if payout settings exist */}
      {showWithdraw && hasPayoutSettings && (
        <WithdrawModal
          available={balance}
          onClose={() => setShowWithdraw(false)}
        />
      )}

      {/* Payout settings modal */}
      {showPayoutSettings && (
        <PayoutSettingsModal
          onClose={() => setShowPayoutSettings(false)}
          onSetupSuccess={() => {
            setHasPayoutSettings(true);
            setShowPayoutSettings(false);
            setShowWithdraw(true); // ✅ open withdraw immediately after setup
          }}
        />
      )}

      {/* Withdrawal history table */}
      <WithdrawalHistory />
    </div>
  );
}
