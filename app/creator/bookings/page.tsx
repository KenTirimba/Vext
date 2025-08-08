'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Booking {
  id: string;
  clientId: string;
  providerId: string;
  videoId?: string;
  date: string;
  time: string;
  total: number;
  status: string;
  addons?: Record<string, number>;
}

interface Video {
  title?: string;
  details?: string;
}

export default function CreatorBookings() {
  const [user] = useAuthState(auth);
  const [bookings, setBookings] = useState<(Booking & { video?: Video })[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const q = query(
        collection(db, 'bookings'),
        where('providerId', '==', user.uid)
      );
      const snap = await getDocs(q);

      const data = await Promise.all(
        snap.docs.map(async (d) => {
          const booking = { id: d.id, ...d.data() } as Booking;
          let video: Video | undefined;

          if (booking.videoId) {
            const videoSnap = await getDoc(doc(db, 'videos', booking.videoId));
            if (videoSnap.exists()) {
              video = videoSnap.data() as Video;
            }
          }

          return { ...booking, video };
        })
      );

      setBookings(data);
    })();
  }, [user]);

  const updateStatus = async (id: string, status: 'accepted' | 'rejected' | 'completed') => {
    await updateDoc(doc(db, 'bookings', id), { status });
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Client Appointments</h1>
      {bookings.length === 0 && <p>No bookings found.</p>}

      {bookings.map((b) => (
        <div key={b.id} className="border p-4 mb-4 rounded shadow">
          {b.video && (
            <>
              <h2 className="text-lg font-semibold">{b.video.title}</h2>
              <p className="text-gray-700">{b.video.details}</p>
            </>
          )}
          <p className="mt-2"><strong>Client:</strong> {b.clientId}</p>
          <p><strong>Date:</strong> {new Date(b.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> {b.time}</p>
          <p><strong>Total:</strong> KSHS {b.total}</p>

          {b.addons && Object.keys(b.addons).length > 0 && (
            <div className="mt-2">
              <strong>Add-ons:</strong>
              <ul className="list-disc list-inside">
                {Object.entries(b.addons).map(([name, qty]) => (
                  <li key={name}>
                    {name} × {qty}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-2"><strong>Status:</strong> {b.status}</p>

          {b.status === 'pending' && (
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => updateStatus(b.id, 'accepted')}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Accept
              </button>
              <button
                onClick={() => updateStatus(b.id, 'rejected')}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                Reject
              </button>
            </div>
          )}

          {b.status === 'accepted' && (
            <button
              onClick={() => updateStatus(b.id, 'completed')}
              className="mt-3 bg-blue-500 text-white px-3 py-1 rounded"
            >
              Mark as Completed
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
