'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, query, orderBy, doc, getDoc, deleteDoc, setDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
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
import { AuthModal } from './AuthModal';

interface VideoDoc {
  url: string;
  title?: string;
  description?: string;
  userId?: string;
  serviceCost?: number;
  addons?: { name: string; cost: number; unit: string }[];
  id: string;
  videoId?: string; // ✅ added so Share uses it
}

interface UserProfile {
  username?: string;
  profilePhoto?: string;
  isServiceProvider?: boolean;
  location?: string;
  businessName?: string;
}

export default function VideoFeed() {
  const [user] = useAuthState(auth);
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [allVideos, setAllVideos] = useState<VideoDoc[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [likesMap, setLikesMap] = useState<Record<string, boolean>>({});
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({});
  const [commentVideo, setCommentVideo] = useState<string | null>(null);
  const [bookingVideo, setBookingVideo] = useState<VideoDoc | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoDoc | null>(null);

  // Reuse the same refs/state names, but now for a scroll-snap container
  const sliderRef = useRef<HTMLDivElement | null>(null);
  const sliderInstanceRef = useRef<any>(null);
  const [isSliderReady, setIsSliderReady] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  // Initialize "instance" and ready flag when DOM is mounted / videos change
  useEffect(() => {
    if (sliderRef.current) {
      sliderInstanceRef.current = sliderRef.current; // truthy so existing checks still work
      setIsSliderReady(true);
    }
  }, [videos.length]);

  // Play/pause currently visible video (≈ keen-slider slideChanged)
  useEffect(() => {
    const root = sliderRef.current;
    if (!root) return;

    const videosEls = Array.from(root.querySelectorAll('video')) as HTMLVideoElement[];
    // Pause all initially
    videosEls.forEach(v => v.pause());

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const vid = entry.target as HTMLVideoElement;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      },
      { root, threshold: [0, 0.6, 1] }
    );

    videosEls.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, [videos.map(v => v.id).join('|')]);

  // One-video-per-wheel step (like the plugin), throttled
  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    let wheelActive = false;
    let wheelTimeout: ReturnType<typeof setTimeout> | undefined;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (wheelActive) return;
      wheelActive = true;

      if (e.deltaY > 0) scrollNext();
      else if (e.deltaY < 0) scrollPrev();

      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        wheelActive = false;
      }, 120);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel as EventListener);
      clearTimeout(wheelTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSliderReady, videos.length]);

  useEffect(() => {
    (async () => {
      const snap = await getDocs(query(collection(db, 'videos'), orderBy('createdAt', 'desc')));
      const docs = snap.docs.map(d => ({ ...(d.data() as VideoDoc), id: d.id }));
      console.log("Loaded videos:", docs);
      setAllVideos(docs);
      const shuffledVideos = [...docs].sort(() => Math.random() - 0.5);
      setVideos(shuffledVideos);

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
        await Promise.all(docs.map(async v => {
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

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      const data = snap.data();
      if (data) {
        setIsProvider(!!data.isProvider);
        setUsername(data.username || '');
      }
    });
  }, [user]);

  // Infinite scroll down
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || allVideos.length === 0) return;

    const threshold = 3 * (el.clientHeight || window.innerHeight);

    const handleScrollDown = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - (scrollTop + clientHeight) < threshold) {
        const newShuffled = [...allVideos].sort(() => Math.random() - 0.5);
        setVideos(prev => [...prev, ...newShuffled]);
      }
    };

    el.addEventListener('scroll', handleScrollDown);
    return () => el.removeEventListener('scroll', handleScrollDown);
  }, [allVideos]);

  // Infinite scroll up
  useEffect(() => {
    const el = sliderRef.current;
    if (!el || allVideos.length === 0) return;

    const threshold = 3 * (el.clientHeight || window.innerHeight);

    const handleScrollUp = () => {
      const { scrollTop, clientHeight } = el;
      if (scrollTop < threshold) {
        const newShuffled = [...allVideos].sort(() => Math.random() - 0.5);
        setVideos(prev => [...newShuffled, ...prev]);
        const addedHeight = newShuffled.length * clientHeight;
        el.scrollTop += addedHeight;
      }
    };

    el.addEventListener('scroll', handleScrollUp);
    return () => el.removeEventListener('scroll', handleScrollUp);
  }, [allVideos]);

  const handleSignOut = async () => {
    await auth.signOut();
    setDropdownOpen(false);
    router.push('/');
  };

  const handleBookingsClick = () => {
    router.push(isProvider ? '/creator/bookings' : '/bookings');
    setDropdownOpen(false);
  };

  const handleLike = async (videoId: string) => {
    if (!user) return alert('Sign in to like');
    const ref = doc(db, 'videos', videoId, 'likes', user.uid!);
    if (likesMap[videoId]) await deleteDoc(ref);
    else await setDoc(ref, { likedAt: Date.now(), userId: user.uid });
    setLikesMap(prev => ({ ...prev, [videoId]: !prev[videoId] }));
  };

  const handleFollow = async (creatorId: string) => {
    if (!user) return alert('Sign in to follow');
    const ref = doc(db, 'users', creatorId, 'followers', user.uid!);
    if (followMap[creatorId]) await deleteDoc(ref);
    else await setDoc(ref, { followedAt: Date.now(), userId: user.uid } as any);
    setFollowMap(prev => ({ ...prev, [creatorId]: !prev[creatorId] }));
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;
    await deleteDoc(doc(db, 'videos', videoId));
    setVideos(prev => prev.filter(v => v.id !== videoId));
    setAllVideos(prev => prev.filter(v => v.id !== videoId));
  };

  // NEW: compute current slide index from scrollTop
  const getCurrentIndex = (el: HTMLDivElement) => {
    const h = el.clientHeight || window.innerHeight;
    return Math.round(el.scrollTop / h);
  };

  const scrollNext = () => {
    const el = sliderRef.current;
    if (!el || videos.length === 0) return;
    const h = el.clientHeight || window.innerHeight;
    const idx = getCurrentIndex(el);
    const next = idx + 1;
    el.scrollTo({
      top: next * h,
      behavior: 'smooth',
    });
  };

  const scrollPrev = () => {
    const el = sliderRef.current;
    if (!el || videos.length === 0) return;
    const h = el.clientHeight || window.innerHeight;
    const idx = getCurrentIndex(el);
    const prev = idx - 1;
    el.scrollTo({
      top: prev * h,
      behavior: 'smooth',
    });
  };

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  // ✅ share handler
  const handleShare = (video: VideoDoc) => {
    const link = `${window.location.origin}/video/${video.videoId || video.id}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden">
      {/* Profile Button */}
      <div className="absolute top-3 right-3 z-50">
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="focus:outline-none">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="profile" className="w-9 h-9 rounded-full object-cover border border-white/40" />
            ) : (
              <div className="w-9 h-9 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">U</span>
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-lg p-2 text-white text-sm">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 p-1 mb-2 bg-gray-800 rounded">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white">U</span>
                      </div>
                    )}
                    <span className="font-semibold truncate">@{username}</span>
                  </div>

                  {isProvider && (
                    <>
                      <button onClick={() => { router.push('/upload'); setDropdownOpen(false); }} className="block w-full px-2 py-1 hover:bg-gray-700 rounded mb-1">
                        Upload
                      </button>

                      <button onClick={() => { router.push('/provider/dashboard'); setDropdownOpen(false); }} className="block w-full px-2 py-1 hover:bg-gray-700 rounded mb-1">
                        Provider Dashboard
                      </button>
                    </>
                  )}

                  <button onClick={handleBookingsClick} className="block w-full px-2 py-1 hover:bg-gray-700 rounded mb-1">
                    {isProvider ? 'Client Bookings' : 'My Bookings'}
                  </button>

                  <button onClick={() => { router.push('/profile'); setDropdownOpen(false); }} className="block w-full px-2 py-1 hover:bg-gray-700 rounded mb-1">
                    Edit Profile
                  </button>

                  <button onClick={handleSignOut} className="block w-full px-2 py-1 hover:bg-gray-700 rounded text-red-400">
                    Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => setAuthDialogOpen(true)} className="block w-full px-2 py-1 hover:bg-gray-700 rounded">
                  Sign In / Sign Up
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scroll-snap container */}
      <div
        ref={sliderRef}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {videos.map((v, i) => {
          const up = userProfiles[v.userId || ''] || {};
          const liked = likesMap[v.id];
          const followed = up && user ? followMap[v.userId!] : false;
          const isOwner = v.userId === user?.uid;

          return (
            <div key={`${v.id}-${i}`} className="relative h-screen flex items-center justify-center snap-start">
              <video
                src={v.url}
                muted
                loop
                playsInline
                onClick={togglePlay}
                className="max-h-screen max-w-full object-contain z-40"
              />

              {/* Username */}
              <div
                onClick={() => v.userId && router.push(`/creator/${v.userId}`)}
                className="absolute top-3 left-3 bg-black/70 px-1 py-0.5 rounded-md cursor-pointer hover:bg-black/90 transition text-xs font-semibold text-white z-50"
              >
                {up.businessName ? up.businessName : `@${up.username || 'unknown'}`}
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-3 right-3 flex flex-col items-center space-y-2 z-50">
                <button onClick={() => handleLike(v.id)} className="text-xl">
                  {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                </button>
                <button className="text-xl" onClick={() => setCommentVideo(v.id)}>
                  <FaCommentDots />
                </button>
                <button className="text-xl" onClick={() => handleShare(v)}>
                  <FaShare />
                </button>
                {v.userId !== user?.uid && (
                  <button onClick={() => handleFollow(v.userId!)} className="text-xl">
                    {followed ? <FaUserCheck /> : <FaUserPlus />}
                  </button>
                )}
                <button onClick={() => setBookingVideo(v)} className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs">
                  Book Service
                </button>
              </div>

              {/* Owner Edit/Delete */}
              {isOwner && (
                <div className="absolute top-16 right-3 flex flex-col space-y-1 z-50">
                  <button onClick={() => setEditingVideo(v)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded">
                    Delete
                  </button>
                </div>
              )}

              {/* Title & Description */}
              {(v.title || v.description) && (
                <div className="absolute bottom-3 left-3 max-w-[60%] text-shadow overflow-hidden text-ellipsis z-50">
                  {v.title && <h3 className="text-sm font-bold text-white">{v.title}</h3>}
                  {v.description && <p className="text-xs text-gray-200">{v.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll Buttons */}
      {isSliderReady && sliderInstanceRef.current && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex flex-col space-y-2 z-50">
          <button onClick={scrollPrev} className="bg-white/20 hover:bg-white/40 p-1 rounded-full text-white">
            <FaChevronUp />
          </button>
          <button onClick={scrollNext} className="bg-white/20 hover:bg-white/40 p-1 rounded-full text-white">
            <FaChevronDown />
          </button>
        </div>
      )}

      {authDialogOpen && <AuthModal open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />}
      {commentVideo && <CommentModal videoId={commentVideo} onClose={() => setCommentVideo(null)} />}
      {bookingVideo && <BookingModal video={bookingVideo} creator={userProfiles[bookingVideo.userId!] ?? {}} onClose={() => setBookingVideo(null)} />}
      {editingVideo && <EditVideoModal video={editingVideo} onClose={() => setEditingVideo(null)} />}
    </div>
  );
}