"use client";

import { useState } from "react";

export default function WithdrawModal({
  uid,
  onClose,
}: {
  uid: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const handleWithdraw = async () => {
    setMessage("");

    const res = await fetch("/api/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phoneNumber, amount }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Withdrawal request submitted successfully!");
    } else {
      setMessage(data.error || "Withdrawal failed");
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl p-6 w-96 shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Withdraw Funds</h2>

        <input
          type="text"
          placeholder="Name"
          className="w-full p-2 border rounded mb-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="text"
          placeholder="M-PESA Phone (e.g. 2547XXXXXXXX)"
          className="w-full p-2 border rounded mb-2"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          type="number"
          placeholder="Amount"
          className="w-full p-2 border rounded mb-2"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {message && <p className="text-red-600 mb-2">{message}</p>}

        <div className="flex justify-between">
          <button
            onClick={handleWithdraw}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Submit Withdrawal
          </button>
          <button
            onClick={onClose}
            className="bg-gray-400 text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}