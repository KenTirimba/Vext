'use client';

import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile } from '../lib/auth';

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const toggleMode = () => setIsSignUp(!isSignUp);

  const handleSubmit = async () => {
    try {
      const userCred = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);

      await createUserProfile(userCred.user);
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await createUserProfile(result.user);
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white p-6 rounded-xl w-[360px] space-y-5 text-center shadow-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold">
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>

        <button
          onClick={handleGoogle}
          className="w-full py-2 rounded-md bg-black text-white font-medium hover:bg-gray-800"
        >
          Continue with Google
        </button>

        <div className="text-gray-400 text-xs uppercase tracking-wide">or use email</div>

        <input
          className="w-full px-3 py-2 border rounded-md text-gray-800 bg-white"
          placeholder="Email or Phone"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="w-full px-3 py-2 border rounded-md text-gray-800 bg-white"
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          className="w-full py-2 rounded-md bg-blue-500 text-white font-medium hover:bg-blue-600"
        >
          {isSignUp ? 'Create Account' : 'Sign In'}
        </button>

        <p className="text-sm">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={toggleMode}
            className="text-blue-500 hover:underline"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
};