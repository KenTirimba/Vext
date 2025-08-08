'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc, collection, orderBy, query, getDocs } from 'firebase/firestore';
import WithdrawModal from '@/components/WithdrawModal';

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net: number;
  method: string;
  status: string;
  createdAt: any;
}

export default function ProviderDashboard() {
  const [user] = useAuthState(auth);
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ available: 0, pending: 0, lifetime: 0 });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const userSnap = await getDoc(doc(db, 'users', user.uid));
      const data = userSnap.data();
      if (data?.wallet) {
        setBalances({
          available: data.wallet.available,
          pending: data.wallet.pending,
          lifetime: data.wallet.lifetime,
        });
      }

      const q = query(collection(db, 'users', user.uid, 'withdrawals'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Withdrawal) })));
      setLoading(false);
    })();
  }, [user]);

  if (!user) return <p className="p-6">Please sign in to view this page.</p>;
  if (loading) return <p className="p-6">Loading dashboard…</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Provider Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white shadow rounded">
          <h2 className="font-semibold">Available</h2>
          <p className="text-xl">KSHS {balances.available}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="font-semibold">Pending</h2>
          <p className="text-xl">KSHS {balances.pending}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="font-semibold">Lifetime</h2>
          <p className="text-xl">KSHS {balances.lifetime}</p>
        </div>
      </div>

      <button
        onClick={() => setModalOpen(true)}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Withdraw Funds
      </button>

      <section>
        <h2 className="text-xl font-semibold mt-6">Withdrawal History</h2>
        {withdrawals.length === 0 ? (
          <p className="mt-2">No withdrawal history yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {withdrawals.map(w => (
              <li key={w.id} className="border p-3 rounded">
                <p>Amount: KSHS {w.amount}</p>
                <p>Fee: KSHS {w.fee}</p>
                <p>Net: KSHS {w.net}</p>
                <p>Method: {w.method}</p>
                <p>Status: {w.status}</p>
                <p>Date: {new Date(w.createdAt.seconds * 1000).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {modalOpen && <WithdrawModal available={balances.available} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
