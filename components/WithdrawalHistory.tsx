"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  orderBy,
  getDocs,
} from "firebase/firestore";

interface Withdrawal {
  id: string;
  amount: number;
  fee: number;
  net: number;
  method: string;
  status: string;
  createdAt?: { seconds: number; nanoseconds: number };
}

export default function WithdrawalHistory() {
  const [user] = useAuthState(auth);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWithdrawals = async () => {
      if (!user) return;
      setLoading(true);

      const ref = collection(db, "users", user.uid, "withdrawals");
      const q = query(ref, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const list: Withdrawal[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Withdrawal),
      }));

      setWithdrawals(list);
      setLoading(false);
    };

    fetchWithdrawals();
  }, [user]);

  if (!user) return <p className="p-6">Please log in to view withdrawals.</p>;
  if (loading) return <p className="p-6">Loading withdrawal history…</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Withdrawal History</h2>
      {withdrawals.length === 0 ? (
        <p>No withdrawals yet.</p>
      ) : (
        <ul className="space-y-3">
          {withdrawals.map((w) => (
            <li key={w.id} className="p-4 border rounded shadow-sm bg-white">
              <p>
                <span className="font-semibold">Amount:</span> KES {w.amount}
              </p>
              <p>
                <span className="font-semibold">Fee:</span> KES {w.fee}
              </p>
              <p>
                <span className="font-semibold">Net:</span> KES {w.net}
              </p>
              <p>
                <span className="font-semibold">Method:</span> {w.method}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                <span
                  className={
                    w.status === "success"
                      ? "text-green-600 font-medium"
                      : w.status === "failed"
                      ? "text-red-600 font-medium"
                      : "text-yellow-600 font-medium"
                  }
                >
                  {w.status}
                </span>
              </p>
              {w.createdAt && (
                <p className="text-sm text-gray-500">
                  {new Date(w.createdAt.seconds * 1000).toLocaleString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
