'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

interface Comment {
  id: string;
  userId: string;
  commentText: string;
  createdAt: number;
  username?: string;
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
      const snap = await getDocs(query(
        collection(db, 'videos', videoId, 'comments'),
        orderBy('createdAt', 'asc')
      ));
      const arr: Comment[] = [];
      for (const d of snap.docs) {
        const data = d.data() as any;
        arr.push({
          id: d.id,
          userId: data.userId,
          commentText: data.commentText,
          createdAt: data.createdAt,
          username: data.username || 'unknown',
        });
      }
      setComments(arr);
    }
    loadComments().catch(console.error);
  }, [videoId]);

  const postComment = async () => {
    if (!user || !newComment.trim()) return;
    await addDoc(collection(db, 'videos', videoId, 'comments'), {
      userId: user.uid,
      commentText: newComment.trim(),
      createdAt: Date.now(),
      username: user.displayName || user.email?.split('@')[0] || 'anon'
    });
    setNewComment('');

    const snap = await getDocs(query(
      collection(db, 'videos', videoId, 'comments'),
      orderBy('createdAt', 'asc')
    ));
    const arr: Comment[] = snap.docs.map(d => ({
      id: d.id,
      userId: (d.data() as any).userId,
      commentText: (d.data() as any).commentText,
      createdAt: (d.data() as any).createdAt,
      username: (d.data() as any).username
    }));
    setComments(arr);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-end z-50">
      <div className="bg-white rounded-t-xl max-h-[80vh] overflow-auto w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-4 text-gray-600 text-2xl hover:text-black"
          aria-label="Close"
        >
          &times;
        </button>

        <div className="pt-10 px-4 space-y-5">
          {comments.map(c => (
            <div key={c.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold">@{c.username}</span>
                <div className="flex space-x-3">
                  <button>Like</button>
                  <button>Reply</button>
                </div>
              </div>
              <p>{c.commentText}</p>
            </div>
          ))}
        </div>

        <div className="p-4 border-t flex space-x-2">
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 border rounded-full px-3 py-2"
          />
          <button onClick={postComment} className="text-blue-500 font-semibold">
            Post
          </button>
        </div>
      </div>
    </div>
  );
}