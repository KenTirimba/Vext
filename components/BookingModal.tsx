'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { auth, db } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { addDoc, collection, updateDoc, doc, getDoc } from 'firebase/firestore';

interface Addon {
  name: string;
  cost: number;
  unit: string;
}

interface VideoDoc {
  serviceCost?: number;
  addons?: Addon[];
  userId?: string;
  id?: string; // ensure we can pass videoId
}

interface UserProfile {
  location?: string;
  phone?: string;
  name?: string;
}

interface BookingModalProps {
  video: VideoDoc;
  creator: UserProfile;
  onClose: () => void;
}

export default function BookingModal({ video, creator, onClose }: BookingModalProps) {
  const [user] = useAuthState(auth);
  const [profileComplete, setProfileComplete] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [addonSelections, setAddonSelections] = useState<Record<string, number>>({});

  const base = video.serviceCost || 0;
  const addons = video.addons || [];

  const total = base + Object.entries(addonSelections).reduce((sum, [name, qty]) => {
    const addon = addons.find(a => a.name === name);
    return sum + (addon ? addon.cost * qty : 0);
  }, 0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setProfileComplete(!!d.fullName && !!d.phone);
        setName(d.fullName || '');
        setPhone(d.phone || '');
      }
    });
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return alert('You must be signed in');
    if (!name.trim() || !phone) return alert('Name & phone are required');
    await updateDoc(doc(db, 'users', user.uid), { fullName: name.trim(), phone });
    setProfileComplete(true);
  };

  const handlePay = async () => {
    if (!profileComplete) return;
    try {
      await addDoc(collection(db, 'bookings'), {
        clientId: user!.uid,
        providerId: video.userId,
        videoId: video.id || '', // store the videoId
        date: selectedDate.toISOString(),
        time: selectedTime,
        total,
        addons: addonSelections, // keep raw qty data
        addonsSelected: Object.keys(addonSelections), // store just the names for provider view
        status: 'pending',
        createdAt: Date.now(),
        clientPhone: phone,
        providerPhone: creator.phone,
      });

      const res = await fetch('/api/paystack/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, amount: total }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment init failed');
      window.location.href = data.authorization_url;
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleAddon = (name: string) => {
    setAddonSelections(prev => {
      const current = { ...prev };
      if (name in current) {
        delete current[name];
      } else {
        current[name] = 1;
      }
      return current;
    });
  };

  const updateAddonQty = (name: string, qty: number) => {
    setAddonSelections(prev => ({
      ...prev,
      [name]: Math.max(1, qty),
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
              onChange={setPhone}
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
            <p>Provider location: {creator.location || 'N/A'}</p>
            <p>Total Cost: KSHS {total}</p>
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