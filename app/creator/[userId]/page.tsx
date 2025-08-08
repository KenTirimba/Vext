'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { collection, getDoc, getDocs, query, where, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface UserProfile {
  username?: string;
  profilePhoto?: string;
  isServiceProvider?: boolean;
  businessName?: string;
  servicesProvided?: string;
  location?: string;
  operatingHours?: string;
}

interface VideoDoc {
  id: string;
  url: string;
}

export default function CreatorProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoDoc[]>([]);

  useEffect(() => {
    if (!userId || typeof userId !== 'string') return;

    const load = async () => {
      const userRef = doc(db, 'users', userId);
      const profileSnap = await getDoc(userRef);
      if (profileSnap.exists()) setProfile(profileSnap.data() as UserProfile);

      const vidsQuery = query(collection(db, 'videos'), where('userId', '==', userId));
      const vidsSnap = await getDocs(vidsQuery);
      setVideos(vidsSnap.docs.map(d => ({ id: d.id, url: d.data().url })));
    };

    load().catch(console.error);
  }, [userId]);

  if (!profile) return <p className="text-center mt-20 text-gray-400">Loading profile...</p>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center space-x-4 mb-8">
        {profile.profilePhoto && (
          <img src={profile.profilePhoto} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-2xl font-bold">@{profile.username || 'unknown'}</h1>
          {profile.businessName && <p className="text-sm text-gray-300">{profile.businessName}</p>}
          {profile.servicesProvided && <p className="text-sm text-gray-400">{profile.servicesProvided}</p>}
          {profile.location && <p className="text-sm text-gray-400">{profile.location}</p>}
          {profile.operatingHours && <p className="text-sm text-gray-400">{profile.operatingHours}</p>}
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Uploaded Videos</h2>
      {videos.length === 0 ? (
        <p className="text-gray-500">No videos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {videos.map(v => (
            <video key={v.id} src={v.url} controls className="w-full h-auto rounded-md" />
          ))}
        </div>
      )}
    </div>
  );
}
