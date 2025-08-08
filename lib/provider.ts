// lib/provider.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function initializeProviderWallet(uid: string) {
  await setDoc(doc(db, 'users', uid), {
    wallet: {
      available: 0,
      pending: 0,
      lifetime: 0,
    }
  }, { merge: true });
}