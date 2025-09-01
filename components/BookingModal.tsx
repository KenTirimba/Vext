'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { auth, db } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { getDoc, doc, updateDoc } from 'firebase/firestore';

interface Addon {
  name: string;
  cost: number;
  unit: string;
}

interface VideoDoc {
  serviceCost?: number;
  addons?: Addon[];
  userId?: string;  // providerId
  id?: string;      // videoId
}

interface BookingModalProps {
  video: VideoDoc;
  onClose: () => void;
}

export default function BookingModal({ video, onClose }: BookingModalProps) {
  const [user] = useAuthState(auth);
  const [profileComplete, setProfileComplete] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [addonSelections, setAddonSelections] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'mpesa' | ''>(''); // ✅ existing
  const [mpesaPhone, setMpesaPhone] = useState(''); // ✅ NEW: number to be charged

  const base = video.serviceCost || 0;
  const addons = video.addons || [];
  const total = base + Object.entries(addonSelections).reduce((sum, [n, qty]) => {
    const addon = addons.find(a => a.name === n);
    return sum + (addon ? addon.cost * qty : 0);
  }, 0);

  useEffect(() => {
    if (!user) return;

    // ✅ fetch client profile
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setProfileComplete(!!d.fullName && !!d.phone);
        setName(d.fullName || '');
        setPhone(d.phone || '');
        setMpesaPhone(d.phone || ''); // ✅ prefill charge number with saved phone
      }
    });
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return alert('You must be signed in');
    if (!name.trim() || !phone) return alert('Name & phone are required');

    await updateDoc(doc(db, 'users', user.uid), { fullName: name.trim(), phone });

    // ✅ re-fetch after save
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const d = snap.data() as any;
      setProfileComplete(!!d.fullName && !!d.phone);
      setName(d.fullName || '');
      setPhone(d.phone || '');
      setMpesaPhone(d.phone || ''); // ✅ keep in sync
    }
  };

  // ✅ NEW: normalize phone to 2547XXXXXXXX for STK
  function normalizeKeMpesaPhone(raw: string) {
    let p = (raw || '').trim();
    if (!p) throw new Error('Please enter the M-Pesa phone number to charge');

    // strip spaces and non-digits except leading '+'
    p = p.replace(/\s+/g, '');
    if (p.startsWith('+')) p = p.slice(1);

    // map common forms to 2547XXXXXXXX
    if (p.startsWith('0')) {
      // 07XXXXXXXX -> 2547XXXXXXXX
      p = `254${p.slice(1)}`;
    } else if (p.startsWith('7')) {
      // 7XXXXXXXX -> 2547XXXXXXXX
      p = `254${p}`;
    } else if (p.startsWith('254')) {
      // already in 254...
    } else {
      throw new Error('Enter a valid KE number e.g. 2547XXXXXXXX');
    }

    // digits only
    p = p.replace(/\D/g, '');

    if (!(p.length === 12 && p.startsWith('2547'))) {
      throw new Error('Invalid Safaricom number. Use format 2547XXXXXXXX');
    }

    return p;
  }

  const handlePay = async () => {
    if (!profileComplete) return;
    if (!paymentMethod) return alert('Please select a payment method');

    try {
      const bookingData = {
        clientId: user!.uid,
        providerId: video.userId,
        videoId: video.id || '',
        date: selectedDate.toISOString(),
        time: selectedTime,
        total,
        addons: addonSelections,
      };

      // ✅ save booking first
      const saveRes = await fetch('/api/save-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error || 'Failed to save booking');

      const bookingId = saveData.bookingId;

      if (paymentMethod === 'paystack') {
        // ✅ create Paystack transaction
        const initRes = await fetch('/api/paystack/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user?.email,
            amount: total,
            metadata: { bookingId },
          }),
        });

        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(initData.error || 'Payment init failed');

        const PaystackPop = (window as any).PaystackPop;
        if (!PaystackPop) {
          alert("Payment system not loaded. Please refresh.");
          return;
        }

        const paystackHandler = PaystackPop.setup({
          key: process.env.NEXT_PUBLIC_PAYSTACK_KEY,
          email: user?.email,
          amount: total * 100,
          currency: 'KES',
          ref: initData.reference,
          metadata: { bookingId },
          callback: (response: any) => {
            (async () => {
              try {
                await fetch('/api/confirm-booking', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bookingId,
                    paymentRef: response.reference,
                  }),
                });

                alert('Payment successful! Your booking is confirmed.');
                onClose();
              } catch (err) {
                console.error('Confirm booking error:', err);
                alert('Payment went through but booking confirmation failed.');
              }
            })();
          },
          onClose: () => {
            alert('Payment window closed');
          }
        });

        paystackHandler.openIframe();
      }

      if (paymentMethod === 'mpesa') {
        // ✅ Use the number the user wants to be charged
        const msisdn = normalizeKeMpesaPhone(mpesaPhone || phone);

        // ✅ Call your Daraja STK Push API
        const mpesaRes = await fetch('/api/mpesa/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: msisdn,
            amount: total,
            bookingId,
          }),
        });

        const mpesaData = await mpesaRes.json();
        if (!mpesaRes.ok) throw new Error(mpesaData.error || 'M-Pesa init failed');

        alert('M-Pesa STK Push sent to your phone. Please complete payment.');
        onClose();
      }

    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleAddon = (n: string) => {
    setAddonSelections(prev => {
      const current = { ...prev };
      if (n in current) {
        delete current[n];
      } else {
        current[n] = 1;
      }
      return current;
    });
  };

  const updateAddonQty = (n: string, qty: number) => {
    setAddonSelections(prev => ({
      ...prev,
      [n]: Math.max(1, qty),
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white text-black rounded-lg p-6 w-[90vw] max-w-md shadow-lg relative">
        <button onClick={onClose} className="text-xl absolute top-4 right-4">×</button>

        {!profileComplete ? (
          <>
            <h2 className="text-lg font-bold mb-3">Complete Your Profile</h2>
            <label className="block mb-2">Full Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded px-2 py-1 mb-4"
            />
            <label className="block mb-2">Phone Number</label>
            <PhoneInput
              international
              defaultCountry="KE"
              value={phone}
              onChange={(value) => setPhone(value || '')}
              className="w-full mb-4"
            />
            <button onClick={handleProfileSave} className="w-full bg-blue-600 text-white py-2 rounded">
              Save & Continue
            </button>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="text-lg font-bold mb-3">Book Service</h2>
            <label>Select Date:</label>
            <Calendar onChange={d => setSelectedDate(d as Date)} value={selectedDate} />
            <label className="mt-4 block">Select Time:</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
            >
              <option value="">-- time --</option>
              {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
                .map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <div className="mt-4">
              <p className="font-semibold">Service cost: KSHS {base}</p>
              {addons.length > 0 && (
                <>
                  <p className="mt-2 font-semibold">Add-ons:</p>
                  {addons.map(a => (
                    <div key={a.name} className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        checked={a.name in addonSelections}
                        onChange={() => toggleAddon(a.name)}
                      />
                      <span className="flex-1">{a.name} (+KSHS {a.cost}/{a.unit})</span>
                      {a.name in addonSelections && (
                        <input
                          type="number"
                          min={1}
                          value={addonSelections[a.name]}
                          onChange={e => updateAddonQty(a.name, +e.target.value)}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            <p className="mt-4 font-bold">Total: KSHS {total}</p>
            <button
              onClick={() => setStep(2)}
              className="mt-4 w-full bg-green-600 text-white py-2 rounded"
            >
              Book
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-3">Confirm Booking</h2>
            <p>Date: {selectedDate.toDateString()}</p>
            <p>Time: {selectedTime}</p>
            <p>Total Cost: KSHS {total}</p>

            {/* ✅ Payment Method Choice */}
            <div className="mt-4">
              <label className="block font-semibold">Select Payment Method:</label>
              <select
                className="w-full border rounded px-2 py-1 mt-2"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'paystack' | 'mpesa')}
              >
                <option value="">-- choose --</option>
                <option value="paystack">Pay with Card (Paystack)</option>
                <option value="mpesa">Pay with M-Pesa</option>
              </select>
            </div>

            {/* ✅ NEW: Let user type the M-Pesa number they want to charge */}
            {paymentMethod === 'mpesa' && (
              <div className="mt-3">
                <label className="block font-semibold">M-Pesa phone to charge</label>
                <input
                  type="tel"
                  placeholder="2547XXXXXXXX"
                  className="w-full border rounded px-2 py-1 mt-2"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                />
                <p className="text-xs text-gray-600 mt-1">Use format 2547XXXXXXXX (no + sign).</p>
              </div>
            )}

            <button
              onClick={handlePay}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded"
            >
              Proceed to Pay
            </button>
          </>
        )}
      </div>
    </div>
  );
}