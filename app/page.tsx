'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Navbar } from '@/components/Navbar';
import { AuthModal } from '@/components/AuthModal';
import VideoFeed from '@/components/VideoFeed';

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      if (u) setAuthOpen(false);
    });
    return () => unsub();
  }, []);

  return (
    <main className="bg-black text-white min-h-screen">
      <Navbar onAuthClick={() => setAuthOpen(true)} />
      <div className="pt-20">
        <VideoFeed />
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}