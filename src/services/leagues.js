import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { getAllActivities, computeLeaderboard, getDateRanges } from './activities';
import { getAllUsers } from './users';
import { startOfWeek, subWeeks, endOfWeek, format } from 'date-fns';

const LEAGUES = 'leagues';
const MEMBERS = 'leagueMembers';
const INVITES = 'leagueInvites';
const MAX_MEMBERS = 50;

function memberDocId(leagueId, userId) {
  return `${leagueId}_${userId}`;
}

// --- League CRUD ---

export async function createLeague(userId, { name, description, visibility }) {
  const leagueRef = await addDoc(collection(db, LEAGUES), {
    name,
    description: description || '',
    visibility: visibility || 'public',
    createdBy: userId,
    memberCount: 1,
    lastWeekLeader: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(doc(db, MEMBERS, memberDocId(leagueRef.id, userId)), {
    leagueId: leagueRef.id,
    userId,
    role: 'admin',
    status: 'active',
    joinedAt: serverTimestamp(),
  });

  return leagueRef.id;
}

export async function getLeague(leagueId) {
  const snap = await getDoc(doc(db, LEAGUES, leagueId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function updateLeague(leagueId, data) {
  await updateDoc(doc(db, LEAGUES, leagueId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLeague(leagueId) {
  const membersSnap = await getDocs(
    query(collection(db, MEMBERS), where('leagueId', '==', leagueId))
  );
  const invitesSnap = await getDocs(
    query(collection(db, INVITES), where('leagueId', '==', leagueId))
  );

  const batch = writeBatch(db);
  membersSnap.docs.forEach((d) => batch.delete(d.ref));
  invitesSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, LEAGUES, leagueId));
  await batch.commit();
}

// --- Membership ---

export async function getMyLeagues(userId) {
  const snap = await getDocs(
    query(collection(db, MEMBERS), where('userId', '==', userId))
  );
  const memberships = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((m) => m.status === 'active');

  if (!memberships.length) return [];

  const leagues = await Promise.all(
    memberships.map((m) => getLeague(m.leagueId))
  );
  return leagues
    .filter(Boolean)
    .map((league) => {
      const membership = memberships.find((m) => m.leagueId === league.id);
      return { ...league, myRole: membership.role };
    });
}

export async function getLeagueMembers(leagueId) {
  const snap = await getDocs(
    query(collection(db, MEMBERS), where('leagueId', '==', leagueId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMembership(leagueId, userId) {
  const snap = await getDoc(doc(db, MEMBERS, memberDocId(leagueId, userId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function requestToJoin(leagueId, userId) {
  const leagueRef = doc(db, LEAGUES, leagueId);
  await runTransaction(db, async (transaction) => {
    const leagueSnap = await transaction.get(leagueRef);
    if (!leagueSnap.exists()) throw new Error('League not found');
    if (leagueSnap.data().visibility !== 'public') throw new Error('League is private');
    if ((leagueSnap.data().memberCount || 0) >= MAX_MEMBERS) throw new Error('League is full');

    const existingRef = doc(db, MEMBERS, memberDocId(leagueId, userId));
    const existingSnap = await transaction.get(existingRef);
    if (existingSnap.exists()) throw new Error('Already a member or request pending');

    transaction.set(existingRef, {
      leagueId,
      userId,
      role: 'member',
      status: 'pending',
      joinedAt: serverTimestamp(),
    });
  });
}

export async function approveJoinRequest(leagueId, userId) {
  const leagueRef = doc(db, LEAGUES, leagueId);
  const memberRef = doc(db, MEMBERS, memberDocId(leagueId, userId));
  await runTransaction(db, async (transaction) => {
    const leagueSnap = await transaction.get(leagueRef);
    if (!leagueSnap.exists()) throw new Error('League not found');
    if ((leagueSnap.data().memberCount || 0) >= MAX_MEMBERS) throw new Error('League is full');

    transaction.update(memberRef, { status: 'active' });
    transaction.update(leagueRef, { memberCount: increment(1) });
  });
}

export async function rejectJoinRequest(leagueId, userId) {
  await deleteDoc(doc(db, MEMBERS, memberDocId(leagueId, userId)));
}

export async function leaveLeague(leagueId, userId) {
  const leagueRef = doc(db, LEAGUES, leagueId);
  const memberRef = doc(db, MEMBERS, memberDocId(leagueId, userId));
  await runTransaction(db, async (transaction) => {
    const memberSnap = await transaction.get(memberRef);
    if (!memberSnap.exists()) return;
    if (memberSnap.data().role === 'admin') {
      const allMembers = await getLeagueMembers(leagueId);
      const otherAdmins = allMembers.filter(
        (m) => m.role === 'admin' && m.userId !== userId && m.status === 'active'
      );
      if (!otherAdmins.length) throw new Error('Cannot leave: you are the only admin. Assign another admin first.');
    }
    transaction.delete(memberRef);
    transaction.update(leagueRef, { memberCount: increment(-1) });
  });
}

// --- Admin management ---

export async function promoteToAdmin(leagueId, userId) {
  await updateDoc(doc(db, MEMBERS, memberDocId(leagueId, userId)), {
    role: 'admin',
  });
}

export async function demoteFromAdmin(leagueId, userId) {
  const members = await getLeagueMembers(leagueId);
  const otherAdmins = members.filter(
    (m) => m.role === 'admin' && m.userId !== userId && m.status === 'active'
  );
  if (!otherAdmins.length) {
    throw new Error('Cannot demote: at least one admin is required');
  }
  await updateDoc(doc(db, MEMBERS, memberDocId(leagueId, userId)), {
    role: 'member',
  });
}

// --- Invites ---

export async function inviteUser(leagueId, leagueName, { userId, email }, invitedByUid, invitedByName) {
  const inviteId = userId
    ? memberDocId(leagueId, userId)
    : `${leagueId}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const existing = await getDoc(doc(db, INVITES, inviteId));
  if (existing.exists() && existing.data().status === 'pending') {
    throw new Error('Invite already pending');
  }

  if (userId) {
    const membership = await getMembership(leagueId, userId);
    if (membership) throw new Error('User is already a member or has a pending request');
  }

  await setDoc(doc(db, INVITES, inviteId), {
    leagueId,
    leagueName,
    invitedUserId: userId || null,
    invitedEmail: email,
    invitedBy: invitedByUid,
    invitedByName,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getMyInvites(userId) {
  const snap = await getDocs(
    query(collection(db, INVITES), where('invitedUserId', '==', userId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((inv) => inv.status === 'pending');
}

export async function getInvitesByEmail(email) {
  const snap = await getDocs(
    query(collection(db, INVITES), where('invitedEmail', '==', email))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((inv) => inv.status === 'pending');
}

export async function linkEmailInvites(email, userId) {
  const invites = await getInvitesByEmail(email);
  const batch = writeBatch(db);
  invites.forEach((inv) => {
    batch.update(doc(db, INVITES, inv.id), { invitedUserId: userId });
  });
  if (invites.length) await batch.commit();
  return invites.length;
}

export async function acceptInvite(inviteId, leagueId, userId) {
  const leagueRef = doc(db, LEAGUES, leagueId);
  const inviteRef = doc(db, INVITES, inviteId);
  const memberRef = doc(db, MEMBERS, memberDocId(leagueId, userId));

  await runTransaction(db, async (transaction) => {
    const leagueSnap = await transaction.get(leagueRef);
    if (!leagueSnap.exists()) throw new Error('League no longer exists');
    if ((leagueSnap.data().memberCount || 0) >= MAX_MEMBERS) throw new Error('League is full');

    transaction.update(inviteRef, { status: 'accepted' });
    transaction.set(memberRef, {
      leagueId,
      userId,
      role: 'member',
      status: 'active',
      joinedAt: serverTimestamp(),
    });
    transaction.update(leagueRef, { memberCount: increment(1) });
  });
}

export async function declineInvite(inviteId) {
  await updateDoc(doc(db, INVITES, inviteId), { status: 'declined' });
}

export async function getLeagueInvites(leagueId) {
  const snap = await getDocs(
    query(collection(db, INVITES), where('leagueId', '==', leagueId))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((inv) => inv.status === 'pending');
}

// --- Discovery ---

export async function getPublicLeagues() {
  const snap = await getDocs(
    query(collection(db, LEAGUES), where('visibility', '==', 'public'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function searchApprovedUsers(searchTerm) {
  const allUsers = await getAllUsers();
  const term = searchTerm.toLowerCase();
  return allUsers.filter(
    (u) =>
      u.status === 'approved' &&
      (u.email?.toLowerCase().includes(term) ||
        u.nickname?.toLowerCase().includes(term) ||
        u.displayName?.toLowerCase().includes(term))
  );
}

// --- League Leaderboard ---

export async function getLeagueLeaderboard(leagueId, startDate, endDate) {
  const members = await getLeagueMembers(leagueId);
  const activeMembers = members.filter((m) => m.status === 'active');
  const memberIds = new Set(activeMembers.map((m) => m.userId));

  const allUsers = await getAllUsers();
  const leagueUsers = allUsers.filter((u) => memberIds.has(u.id));

  const allActivities = await getAllActivities(startDate, endDate);
  const leagueActivities = allActivities.filter((a) => memberIds.has(a.userId));

  return computeLeaderboard(leagueActivities, leagueUsers);
}

export async function computeAndCacheLastWeekLeader(leagueId) {
  const league = await getLeague(leagueId);
  if (!league) return null;

  const lastMonday = format(
    startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  );

  if (league.lastWeekLeader?.weekStart === lastMonday) {
    return league.lastWeekLeader;
  }

  const lastSunday = format(
    endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }),
    'yyyy-MM-dd'
  );

  const leaderboard = await getLeagueLeaderboard(leagueId, lastMonday, lastSunday);
  if (!leaderboard.length) return null;

  const leader = {
    userId: leaderboard[0].userId,
    nickname: leaderboard[0].nickname,
    totalSteps: leaderboard[0].totalSteps,
    weekStart: lastMonday,
  };

  await updateDoc(doc(db, LEAGUES, leagueId), { lastWeekLeader: leader });
  return leader;
}
