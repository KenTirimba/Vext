'use client';

import { useEffect, useState, useRef } from 'react';
import {
  collection, getDocs, query, orderBy, doc, getDoc, deleteDoc, setDoc
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
  const [isSliderReady, setIsSliderReady] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [isProvider, setIsProvider] = useState(false);
  const [username, setUsername] = useState('');
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
      sliderInstanceRef.current = slider;
      setIsSliderReady(true);
      console.log('Slider instance created:', slider);
    },
  });

  useEffect(() => {
    if (instanceRef.current) {
      sliderInstanceRef.current = instanceRef.current;
      setIsSliderReady(true);
      console.log('Slider instance assigned:', instanceRef.current);
    }
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
  };

  const scrollNext = () => {
    if (sliderInstanceRef.current?.next) {
      sliderInstanceRef.current.next();
    } else {
      console.warn('Slider instance not ready for next action');
    }
  };

  const scrollPrev = () => {
    if (sliderInstanceRef.current?.prev) {
      sliderInstanceRef.current.prev();
    } else {
      console.warn('Slider instance not ready for prev action');
    }
  };

  const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    v.paused ? v.play().catch(() => {}) : v.pause();
  };

  return (
    <div className="relative h-screen w-full bg-black text-white overflow-hidden">
      {/* Profile Button with Dropdown (replacing navbar) */}
      <div className="absolute top-4 right-4 z-50">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="focus:outline-none"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="profile"
                className="w-8 h-8 rounded-full object-cover border border-white/40"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">U</span>
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-gray-900 rounded-lg shadow-lg p-3 text-white">
              {user ? (
                <>
                  <div className="flex items-center space-x-3 p-2 mb-3 bg-gray-800 rounded">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-white">U</span>
                      </div>
                    )}
                    <span className="font-semibold truncate">@{username}</span>
                  </div>

                  {isProvider && (
                    <>
                      <button
                        onClick={() => {
                          router.push('/upload');
                          setDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 hover:bg-gray-700 rounded mb-1"
                      >
                        Upload
                      </button>

                      <button
                        onClick={() => {
                          router.push('/provider/dashboard');
                          setDropdownOpen(false);
                        }}
                        className="block w-full px-3 py-2 hover:bg-gray-700 rounded mb-1"
                      >
                        Provider Dashboard
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      handleBookingsClick();
                    }}
                    className="block w-full px-3 py-2 hover:bg-gray-700 rounded mb-1"
                  >
                    {isProvider ? 'Client Bookings' : 'My Bookings'}
                  </button>

                  <button
                    onClick={() => {
                      router.push('/profile');
                      setDropdownOpen(false);
                    }}
                    className="block w-full px-3 py-2 hover:bg-gray-700 rounded mb-1"
                  >
                    Edit Profile
                  </button>

                  <button
                    onClick={() => {
                      handleSignOut();
                    }}
                    className="block w-full px-3 py-2 hover:bg-gray-700 rounded text-red-400"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setAuthDialogOpen(true);
                  }}
                  className="block w-full px-3 py-2 hover:bg-gray-700 rounded"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div ref={sliderRef} className="keen-slider h-screen">
        {videos.map(v => {
          const up = userProfiles[v.userId || ''] || {};
          const liked = likesMap[v.id];
          const followed = up && user ? followMap[v.userId!] : false;
          const isOwner = v.userId === user?.uid;

          return (
            <div key={v.id} className="keen-slider__slide relative h-screen flex items-center justify-center">
              <video
                src={v.url}
                muted
                loop
                playsInline
                onClick={togglePlay}
                className="h-screen w-full object-contain z-40"
              />

              {/* Username (Top Left, shifted below button area) */}
              <div
                onClick={() => v.userId && router.push(`/creator/${v.userId}`)}
                className="absolute top-8 left-4 bg-black/70 px-3 py-1 rounded-md cursor-pointer hover:bg-black/90 transition text-sm font-semibold text-white z-50"
              >
                @{up.username || 'unknown'}
              </div>

              {/* Action buttons (Bottom Right, Vertical) */}
              <div className="absolute bottom-4 right-4 flex flex-col items-center space-y-4 z-50">
                <button onClick={() => handleLike(v.id)} className="text-2xl">
                  {liked ? <FaHeart className="text-red-500" /> : <FaRegHeart />}
                </button>
                <button className="text-2xl" onClick={() => setCommentVideo(v.id)}>
                  <FaCommentDots />
                </button>
                <button className="text-2xl">
                  <FaShare />
                </button>
                {v.userId !== user?.uid && (
                  <button onClick={() => handleFollow(v.userId!)} className="text-2xl">
                    {followed ? <FaUserCheck /> : <FaUserPlus />}
                  </button>
                )}
                <button
                  onClick={() => setBookingVideo(v)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm"
                >
                  Book Service
                </button>
              </div>

              {/* Edit/Delete buttons for owner (Top Right, below button area) */}
              {isOwner && (
                <div className="absolute top-20 right-4 flex flex-col space-y-2 z-50">
                  <button
                    onClick={() => setEditingVideo(v)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-2 py-1 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="bg-red-500 hover:bg-red-600 text-white text-sm px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              )}

              {/* Title & Description (Bottom Left, Transparent Background) */}
              {(v.title || v.description) && (
                <div className="absolute bottom-4 left-4 max-w-[50%] bg-transparent px-4 py-3 text-shadow">
                  {v.title && <h3 className="text-lg font-bold text-white">{v.title}</h3>}
                  {v.description && <p className="text-sm text-gray-200">{v.description}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll buttons (only shown when slider is ready) */}
      {isSliderReady && (
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 hidden sm:flex flex-col space-y-2 z-50">
          <button
            onClick={scrollPrev}
            className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white"
          >
            <FaChevronUp />
          </button>
          <button
            onClick={scrollNext}
            className="bg-white/20 hover:bg-white/40 p-2 rounded-full text-white"
          >
            <FaChevronDown />
          </button>
        </div>
      )}

      {authDialogOpen && (
        <AuthModal open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} />
      )}

      {commentVideo && (
        <CommentModal videoId={commentVideo} onClose={() => setCommentVideo(null)} />
      )}

      {bookingVideo && (
        <BookingModal
          video={bookingVideo}
          creator={userProfiles[bookingVideo.userId!] ?? {}}
          onClose={() => setBookingVideo(null)}
        />
      )}

      {editingVideo && (
        <EditVideoModal video={editingVideo} onClose={() => setEditingVideo(null)} />
      )}
    </div>
  );
}