// lib/wallet.ts
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

/** Credit 50% of paid amount to pending balance + lifetime */
export async function creditPendingEarnings(uid: string, amount: number) {
  const half = Math.floor(amount * 0.5);
  await updateDoc(doc(db, 'users', uid), {
    'wallet.pending': increment(half),
    'wallet.lifetime': increment(half),
  });
}

/** Release pending funds to available when service is completed */
export async function releaseEarningsToAvailable(uid: string, amount: number) {
  const half = Math.floor(amount * 0.5);
  await updateDoc(doc(db, 'users', uid), {
    'wallet.pending': increment(-half),
    'wallet.available': increment(half),
  });
}