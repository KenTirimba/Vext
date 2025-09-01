'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function PayoutSettingsModal({ onClose, onSetupSuccess }: { onClose: () => void; onSetupSuccess: () => void }) {
  const [user] = useAuthState(auth);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    if (!name || !phone) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      // Normalize phone number to 254 format for M-Pesa
      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith("0")) {
        normalizedPhone = "254" + normalizedPhone.substring(1);
      }

      // Save payout settings in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        payout_name: name,
        payout_phone: normalizedPhone,
        payout_method: "mpesa",   // ✅ explicitly say it's mpesa
        providerId: user.uid
      }, { merge: true });

      setLoading(false);
      onSetupSuccess();
    } catch (err) {
      console.error("Error saving payout settings:", err);
      setError("Failed to save payout settings. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-lg font-semibold mb-4">Setup Payout</h2>

        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
        />

        <input
          type="tel"
          placeholder="Phone Number (e.g. 0700XXXXXX)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border p-2 mb-3 rounded"
        />

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}