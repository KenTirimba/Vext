'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, query, orderBy, doc, getDoc, deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useKeenSlider } from 'keen-slider/react';
import 'keen-slider/keen-slider.min.css';
import {
  FaChevronDown,
  FaChevronUp,
  FaHeart,
  FaRegHeart,
  FaCommentDots,
  FaShare,
  FaUserPlus,
  FaUserCheck,
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { CommentModal } from './CommentModal';
import BookingModal from './BookingModal';
import { EditVideoModal } from './EditVideoModal';

interface VideoDoc {
  url: string;
  title?: string;
  description?: string;
  userId?: string;
  serviceCost?: number;
  addons?: { name: string; cost: number; unit: string }[];
  id: string;
}

interface UserProfile {
  username?: string;
  profilePhoto?: string;
  isServiceProvider?: boolean;
  location?: string;
}

export default function VideoFeed() {
  const [user] = useAuthState(auth);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [likesMap, setLikesMap] = useState<Record<string, boolean>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [commentVideo, setCommentVideo] = useState<string | null>(null);
  const [bookingVideo, setBookingVideo] = useState<VideoDoc | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoDoc | null>(null);
  const sliderInstanceRef = useRef<any>(null);
  const router = useRouter();

  const [sliderRef, instanceRef] = useKeenSlider<HTMLDivElement>({
    vertical: true,
    loop: true,
    slides: { perView: 1 },
    rubberband: false,
    slideChanged(slider) {
      const i = slider.track.details.rel;
      slider.container.querySelectorAll('video').forEach((v, idx) => {
        const el = v as HTMLVideoElement;
        idx === i ? el.play().catch(() => {}) : el.pause();
      });
    },
    created(slider) {
      const first = slider.container.querySelector('video');
      if (first instanceof HTMLVideoElement) first.play().catch(() => {});
    },
  });

  useEffect(() => {
    sliderInstanceRef.current = instanceRef.current;
  }, [instanceRef]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
      const docs = snap.docs.map(d => ({ ...(d.data() as VideoDoc), id: d.id }));
      setVideos(docs);

      const uids = [...new Set(docs.map(v => v.userId).filter(Boolean))];
      const profiles: Record<string, UserProfile> = {};
      await Promise.all(
        uids.map(async id => {
          const ps = await getDoc(doc(db, 'users', id!));
          if (ps.exists()) profiles[id!] = ps.data() as UserProfile;
        })
      );
      setUserProfiles(profiles);

      if (user) {
        const lm: Record<string, boolean> = {};
        await Promise.all(videos.map(async v => {
          const ldoc = await getDoc(doc(db, 'videos', v.id, 'likes', user.uid!));
          lm[v.id] = ldoc.exists();
        }));
        setLikesMap(lm);

        const fl: Record<string, boolean> = {};
        await Promise.all(uids.map(async id => {
          const fdoc = await getDoc(doc(db, 'users', id!, 'followers', user.uid!));
          fl[id!] = fdoc.exists();
        }));
        setFollowMap(fl);
      }
    })().catch(console.error);
  }, [user]);

  const handleLike = async (videoId: string) => {
    if (!user) return alert('Sign in to like');
    const ref = doc(db, 'videos', videoId, 'likes', user.uid!);
    if (likesMap[videoId]) await deleteDoc(ref);
    else await doc(db, 'videos', videoId, 'likes', user.uid!).set({ likedAt: Date.now(), userId: user.uid } as any);
    setLikesMap(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  const handleFollow = async (creatorId: string) => {
    if (!user) return alert('Sign in to follow');
    const ref = doc(db, 'users', creatorId, 'followers', user.uid!);
    if (followMap[creatorId]) await deleteDoc(ref);
    else await doc(db, 'users', creatorId, 'followers', user.uid!).set({ followedAt: Date.now(), userId: user.uid } as any);
    setFollowMap(prev => ({ ...prev, [creatorId]: !prev[creatorId] }));
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;
    await deleteDoc(doc(db, 'videos', videoId));
    setVideos(prev => prev.filter(v => v.id !== videoId));
  };

  const scrollNext = () => {
    const inst = sliderInstanceRef.current;
    if (!inst?.track?.details) return;
    inst.next();
  };
  const scrollPrev = () => {
    const inst = sliderInstanceRef.current;
    if (!inst?.track?.details) return;
    inst.prev();
  };

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden">
      <div ref={sliderRef} className="keen-slider h-full">
        {videos.map(v => {
          const up = userProfiles[v.userId || ''] || {};
          const liked = likesMap[v.id];
          const followed = up && user ? followMap[v.userId!] : false;
          const isOwner = v.userId === user?.uid;

          return (
            <div key={v.id} className="keen-slider__slide relative flex items-center justify-center">
              <video
                src={v.url}
                muted
                loop
                playsInline
                onClick={togglePlay}
                className="max-h-[90vh] max-w-full object-contain rounded-md"
              />

              <div onClick={() => v.userId && router.push(`/creator/${v.userId}`)}
                   className="absolute top-4 left-4 bg-black/60 px-3 py-1 rounded-md cursor-pointer hover:bg-black/80 transition text-sm font-medium">
                @{up.username || 'unknown'}
              </div>

              <div className="absolute right-4 bottom-32 flex flex-col items-center space-y-4">
                <button onClick={() => handleLike(v.id)} className="text-2xl">
                  {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                </button>
                <button className="text-2xl" onClick={() => setCommentVideo(v.id)}>
                  <FaCommentDots />
                </button>
                <button className="text-2xl"><FaShare /></button>
                {v.userId !== user?.uid && (
                  <button onClick={() => handleFollow(v.userId!)} className="text-2xl">
                    {followed ? <FaUserCheck /> : <FaUserPlus />}
                  </button>
                )}
                <button onClick={() => setBookingVideo(v)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mt-2 text-sm">
                  Book Service
                </button>
              </div>

              {isOwner && (
                <div className="absolute top-4 right-4 flex flex-col space-y-2">
                  <button onClick={() => setEditingVideo(v)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-2 py-1 rounded">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(v.id)}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded">
                    Delete
                  </button>
                </div>
              )}

              {(v.title || v.description) && (
                <div className="absolute bottom-0 w-full px-4 py-4 bg-gradient-to-t from-black/80 to-transparent">
                  {v.title && <h3 className="text-lg font-bold">{v.title}</h3>}
                  {v.description && <p className="text-sm text-gray-300">{v.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden sm:flex flex-col space-y-2 z-50">
        <button onClick={scrollPrev}
                className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white">
          <FaChevronUp />
        </button>
        <button onClick={scrollNext}
                className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white">
          <FaChevronDown />
        </button>
      </div>

      {commentVideo && <CommentModal videoId={commentVideo} onClose={() => setCommentVideo(null)} />}

      {bookingVideo && (
        <BookingModal
          video={bookingVideo}
          creator={userProfiles[bookingVideo.userId!] ?? {}}
          onClose={() => setBookingVideo(null)}
        />
      )}

      {editingVideo && (
        <EditVideoModal
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
        />
      )}
    </div>
  );
}