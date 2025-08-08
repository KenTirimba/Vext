// /lib/auth.ts
import { db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import slugify from 'slugify';

export async function createUserProfile(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    const defaultUsername =
      user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
      `user${Math.floor(1000 + Math.random() * 9000)}`;

    await setDoc(ref, {
      uid: user.uid,
      email: user.email || '',
      createdAt: Date.now(),
      username: user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Date.now()}`,
      isProvider: false,
      profilePhoto: user.photoURL || '',
    });
  }
}