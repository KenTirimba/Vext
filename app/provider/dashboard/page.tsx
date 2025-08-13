'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ProviderDashboard() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setLoading(true);

      const bookingsRef = collection(db, 'bookings');
      const q = query(
        bookingsRef,
        where('providerId', '==', user.uid),
        where('status', 'in', ['confirmed', 'accepted'])
      );

      const snap = await getDocs(q);
      let totalBalance = 0;

      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        totalBalance += data.total || 0;
      });

      setBalance(totalBalance);
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <p className="p-6">Please sign in to view this page.</p>;
  if (loading) return <p className="p-6">Loading balance…</p>;

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Provider Dashboard</h1>
      <div className="p-4 bg-white shadow rounded">
        <h2 className="font-semibold">Available Balance</h2>
        <p className="text-xl">KSHS {balance}</p>
      </div>
    </div>
  );
}
