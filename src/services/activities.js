import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subDays,
  format,
} from 'date-fns';

const ACTIVITIES_COLLECTION = 'activities';

function activityDocId(userId, date) {
  return `${userId}_${date}`;
}

export async function saveActivity(userId, date, data) {
  const docId = activityDocId(userId, date);
  await setDoc(doc(db, ACTIVITIES_COLLECTION, docId), {
    userId,
    date,
    steps: data.steps,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getActivity(userId, date) {
  const docId = activityDocId(userId, date);
  const snap = await getDoc(doc(db, ACTIVITIES_COLLECTION, docId));
  return snap.exists() ? snap.data() : null;
}

export async function getUserActivities(userId, startDate, endDate) {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('userId', '==', userId),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function getAllActivities(startDate, endDate) {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export function getDateRanges() {
  const today = new Date();
  const yesterday = subDays(today, 1);
  return {
    yesterday: format(yesterday, 'yyyy-MM-dd'),
    today: format(today, 'yyyy-MM-dd'),
    weekStart: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    weekEnd: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    monthStart: format(startOfMonth(today), 'yyyy-MM-dd'),
    monthEnd: format(endOfMonth(today), 'yyyy-MM-dd'),
    yearStart: format(startOfYear(today), 'yyyy-MM-dd'),
    last7Start: format(subDays(today, 7), 'yyyy-MM-dd'),
    last30Start: format(subDays(today, 30), 'yyyy-MM-dd'),
  };
}

export function computeLeaderboard(activities, users) {
  const userMap = {};
  users.forEach((u) => {
    userMap[u.id] = u;
  });

  const totals = {};
  activities.forEach((a) => {
    if (!totals[a.userId]) {
      totals[a.userId] = { steps: 0, days: 0 };
    }
    totals[a.userId].steps += a.steps;
    totals[a.userId].days += 1;
  });

  return Object.entries(totals)
    .map(([userId, data]) => ({
      userId,
      nickname: userMap[userId]?.nickname || userMap[userId]?.displayName || 'Unknown',
      photoURL: userMap[userId]?.photoURL || '',
      totalSteps: data.steps,
      avgSteps: Math.round(data.steps / data.days),
      days: data.days,
    }))
    .sort((a, b) => b.totalSteps - a.totalSteps);
}

export function computeAverages(activities) {
  if (!activities.length) return { total: 0, average: 0, best: 0, days: 0 };
  const total = activities.reduce((sum, a) => sum + a.steps, 0);
  const best = Math.max(...activities.map((a) => a.steps));
  return {
    total,
    average: Math.round(total / activities.length),
    best,
    days: activities.length,
  };
}
