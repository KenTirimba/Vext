'use client';
import { useEffect, useState } from 'react';
import {
  collection, query, where, getDocs, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function ClientBookings() {
  const [user] = useAuthState(auth);
  const [active, setActive] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [rescheduling, setRescheduling] = useState<any | null>(null);
  const [newDate, setNewDate] = useState<Date>(new Date());
  const [newTime, setNewTime] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDocs(query(collection(db, 'bookings'), where('clientId', '==', user.uid)));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActive(arr.filter(b => b.status === 'pending'));
      setCompleted(arr.filter(b => b.status === 'confirmed'));
    })();
  }, [user]);

  const cancel = async (id: string) => {
    await deleteDoc(doc(db, 'bookings', id));
    setActive(prev => prev.filter(b => b.id !== id));
  };

  const openReschedule = (booking: any) => {
    setRescheduling(booking);
    setNewDate(new Date(booking.date));
    setNewTime(booking.time);
  };

  const confirmReschedule = async () => {
    if (!rescheduling || !newTime) return alert('Select a new time');
    const ref = doc(db, 'bookings', rescheduling.id);
    await updateDoc(ref, {
      date: newDate.toISOString(),
      time: newTime,
      status: 'pending',
      rescheduledAt: Date.now(),
    });
    setActive(prev =>
      prev.map(b => (b.id === rescheduling.id ? { ...b, date: newDate.toISOString(), time: newTime } : b))
    );
    await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: [rescheduling.clientPhone, rescheduling.providerPhone],
        message: `Booking rescheduled to ${newDate.toDateString()} at ${newTime}.`,
      }),
    });
    setRescheduling(null);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      <section className="mb-6">
        <h2 className="text-xl">Active / Pending</h2>
        {active.map(b => (
          <div key={b.id} className="border p-3 mb-3">
            <p>Date: {new Date(b.date).toLocaleDateString()}</p>
            <p>Time: {b.time}</p>
            <p>Total: KSHS {b.total}</p>
            <button onClick={() => cancel(b.id)} className="text-red-600 mr-2">Cancel</button>
            <button onClick={() => openReschedule(b)} className="text-blue-600">Reschedule</button>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-xl">Completed & Past</h2>
        {completed.map(b => (
          <div key={b.id} className="border p-3 mb-3">
            <p>Date: {new Date(b.date).toLocaleDateString()}</p>
            <p>Time: {b.time}</p>
            <p>Total: KSHS {b.total}</p>
          </div>
        ))}
      </section>

      {rescheduling && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[90vw] max-w-md">
            <h3 className="text-lg font-bold mb-4">Reschedule Booking</h3>
            <Calendar onChange={d => setNewDate(d as Date)} value={newDate} />
            <label className="block mt-4 mb-2">Select New Time:</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
            >
              <option value="">-- time --</option>
              {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00']
                .map(t => <option key={t}>{t}</option>)}
            </select>
            <div className="flex justify-end mt-6 space-x-2">
              <button onClick={() => setRescheduling(null)} className="px-4 py-2">Cancel</button>
              <button onClick={confirmReschedule} className="bg-green-600 text-white px-4 py-2 rounded">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}