'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  userId: string;
  commentText: string;
  createdAt: number;
  fullName?: string;
}

interface CommentModalProps {
  videoId: string;
  onClose: () => void;
}

export function CommentModal({ videoId, onClose }: CommentModalProps) {
  const [user] = useAuthState(auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    async function loadComments() {
      const snap = await getDocs(
        query(collection(db, 'videos', videoId, 'comments'), orderBy('createdAt', 'asc'))
      );

      const arr: Comment[] = [];
      for (const d of snap.docs) {
        const data = d.data() as any;

        let fullName = 'Unknown';
        if (data.userId) {
          const userSnap = await getDoc(doc(db, 'users', data.userId));
          if (userSnap.exists()) {
            fullName = (userSnap.data() as any).fullName || 'Unknown';
          }
        }

        arr.push({
          id: d.id,
          userId: data.userId,
          commentText: data.commentText,
          createdAt: data.createdAt,
          fullName,
        });
      }
      setComments(arr);
    }
    loadComments().catch(console.error);
  }, [videoId]);

  const postComment = async () => {
    if (!user || !newComment.trim()) return;

    // get full name from user's profile
    let fullName = user.displayName || user.email?.split('@')[0] || 'Anon';
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        fullName = (snap.data() as any).fullName || fullName;
      }
    } catch (err) {
      console.error('Error fetching fullName:', err);
    }

    await addDoc(collection(db, 'videos', videoId, 'comments'), {
      userId: user.uid,
      commentText: newComment.trim(),
      createdAt: Date.now(),
      fullName,
    });
    setNewComment('');

    // reload comments
    const snap = await getDocs(
      query(collection(db, 'videos', videoId, 'comments'), orderBy('createdAt', 'asc'))
    );
    const arr: Comment[] = [];
    for (const d of snap.docs) {
      const data = d.data() as any;
      arr.push({
        id: d.id,
        userId: data.userId,
        commentText: data.commentText,
        createdAt: data.createdAt,
        fullName: data.fullName,
      });
    }
    setComments(arr);
  };

  return (
    <div className="fixed inset-0 flex justify-end z-50">
      {/* Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      {/* Animated right-side modal */}
      <AnimatePresence>
        <motion.div
          key="commentModal"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="relative bg-white text-gray-900 w-full sm:w-96 h-full shadow-xl"
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-gray-600 text-2xl hover:text-black"
            aria-label="Close"
          >
            &times;
          </button>

          <div className="pt-10 px-4 space-y-5 overflow-y-auto max-h-[calc(100vh-60px)]">
            {comments.map((c) => (
              <div key={c.id} className="space-y-2 border-b pb-2">
                <div className="flex items-center justify-between">
                  {/* Full name instead of @username */}
                  <span className="font-semibold text-gray-800">{c.fullName}</span>
                  <div className="flex space-x-3 text-sm text-blue-600">
                    <button>Like</button>
                    <button>Reply</button>
                  </div>
                </div>
                <p className="text-gray-700">{c.commentText}</p>
              </div>
            ))}
          </div>

          <div className="p-4 border-t flex space-x-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border rounded-full px-3 py-2 text-gray-900"
            />
            <button
              onClick={postComment}
              className="text-blue-600 font-semibold"
            >
              Post
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}