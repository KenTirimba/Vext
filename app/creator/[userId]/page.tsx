'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

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
  const { userId } = useParams() as { userId: string };
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  const [user] = useAuthState(auth);

  // Load profile, videos, and followers
  useEffect(() => {
    if (!userId || typeof userId !== 'string') return;

    const load = async () => {
      // Profile
      const userRef = doc(db, 'users', userId);
      const profileSnap = await getDoc(userRef);
      if (profileSnap.exists()) setProfile(profileSnap.data() as UserProfile);

      // Videos
      const vidsQuery = query(collection(db, 'videos'), where('userId', '==', userId));
      const vidsSnap = await getDocs(vidsQuery);
      setVideos(vidsSnap.docs.map((d) => ({ id: d.id, url: d.data().url })));

      // Followers
      const followersSnap = await getDocs(collection(db, 'users', userId, 'followers'));
      setFollowersCount(followersSnap.size);

      if (user) {
        const fdoc = await getDoc(doc(db, 'users', userId, 'followers', user.uid));
        setIsFollowing(fdoc.exists());
      }
    };

    load().catch(console.error);
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user) {
      alert('Sign in to follow creators');
      return;
    }
    const ref = doc(db, 'users', userId, 'followers', user.uid);
    if (isFollowing) {
      await deleteDoc(ref);
      setIsFollowing(false);
      setFollowersCount((c) => c - 1);
    } else {
      await setDoc(ref, { userId: user.uid, followedAt: Date.now() });
      setIsFollowing(true);
      setFollowersCount((c) => c + 1);
    }
  };

  if (!profile)
    return <p className="text-center mt-20 text-gray-400">Loading profile...</p>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center space-x-4 mb-8">
        {profile.profilePhoto && (
          <img
            src={profile.profilePhoto}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {profile.businessName || `@${profile.username || 'unknown'}`}
          </h1>
          <p className="text-sm text-gray-300">
            by @{profile.username || 'unknown'}
          </p>

          {/* Followers */}
          <p className="text-sm text-gray-400">
            {followersCount} follower{followersCount !== 1 ? 's' : ''}
          </p>

          {/* Follow button */}
          {user?.uid !== userId && (
            <button
              onClick={handleFollow}
              className={`mt-2 px-4 py-1 rounded ${
                isFollowing
                  ? 'bg-gray-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {profile.servicesProvided && (
            <p className="text-sm text-gray-400">{profile.servicesProvided}</p>
          )}
          {profile.location && (
            <p className="text-sm text-gray-400">{profile.location}</p>
          )}
          {profile.operatingHours && (
            <p className="text-sm text-gray-400">{profile.operatingHours}</p>
          )}
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Uploaded Videos</h2>
      {videos.length === 0 ? (
        <p className="text-gray-500">No videos uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {videos.map((v) => (
            <video
              key={v.id}
              src={v.url}
              controls
              className="w-full h-auto rounded-md"
            />
          ))}
        </div>
      )}
    </div>
  );
}