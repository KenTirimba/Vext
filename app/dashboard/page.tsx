'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import VideoFeed from '@/components/VideoFeed';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) router.push('/');
    });
    return () => unsub();
  }, [router]);

  return (
    <main className="bg-black text-white min-h-screen">
      <div className="pt-20">
        <VideoFeed />
      </div>
    </main>
  );
}
