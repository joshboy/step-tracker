import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const USERS_COLLECTION = 'users';
const ADMIN_EMAIL = 'jithankurian@gmail.com';

export async function createUserProfile(uid, data) {
  const isAdmin = data.email === ADMIN_EMAIL;
  const userDoc = {
    email: data.email,
    displayName: data.displayName || '',
    nickname: '',
    photoURL: data.photoURL || '',
    height: null,
    weight: null,
    stepGoal: 10000,
    targetWeight: null,
    status: isAdmin ? 'approved' : 'pending',
    role: isAdmin ? 'admin' : 'user',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, USERS_COLLECTION, uid), userDoc);
  return userDoc;
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getPendingUsers() {
  const q = query(
    collection(db, USERS_COLLECTION),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function approveUser(uid) {
  await updateUserProfile(uid, { status: 'approved' });
}

export async function rejectUser(uid) {
  await updateUserProfile(uid, { status: 'rejected' });
}

export function isAdminEmail(email) {
  return email === ADMIN_EMAIL;
}
