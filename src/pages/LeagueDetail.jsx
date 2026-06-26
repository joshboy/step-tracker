import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getLeague,
  getLeagueMembers,
  getLeagueLeaderboard,
  computeAndCacheLastWeekLeader,
  approveJoinRequest,
  rejectJoinRequest,
  promoteToAdmin,
  demoteFromAdmin,
  leaveLeague,
  deleteLeague,
  updateLeague,
  inviteUser,
  searchApprovedUsers,
  getLeagueInvites,
  getMembership,
} from '../services/leagues';
import { getDateRanges } from '../services/activities';
import { getUserProfile } from '../services/users';
import './leagues.css';

export default function LeagueDetail() {
  const { leagueId } = useParams();
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [league, setLeague] = useState(null);
  const [members, setMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [lastWeekLeader, setLastWeekLeader] = useState(null);
  const [myMembership, setMyMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [message, setMessage] = useState('');

  // Admin state
  const [adminTab, setAdminTab] = useState('members');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [emailInvite, setEmailInvite] = useState('');
  const [pendingInvites, setPendingInvites] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState('public');

  const isAdmin = myMembership?.role === 'admin' && myMembership?.status === 'active';

  useEffect(() => {
    loadLeague();
  }, [leagueId]);

  useEffect(() => {
    if (league) loadLeaderboard();
  }, [period, league]);

  async function loadLeague() {
    setLoading(true);
    try {
      const [leagueData, membersList, membership] = await Promise.all([
        getLeague(leagueId),
        getLeagueMembers(leagueId),
        getMembership(leagueId, currentUser.uid),
      ]);

      if (!leagueData) {
        navigate('/leagues');
        return;
      }

      setLeague(leagueData);
      setMembers(membersList);
      setMyMembership(membership);

      const profiles = {};
      await Promise.all(
        membersList.map(async (m) => {
          const profile = await getUserProfile(m.userId);
          if (profile) profiles[m.userId] = profile;
        })
      );
      setMemberProfiles(profiles);

      const leader = await computeAndCacheLastWeekLeader(leagueId);
      setLastWeekLeader(leader);

      if (membership?.role === 'admin') {
        const invites = await getLeagueInvites(leagueId);
        setPendingInvites(invites);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function loadLeaderboard() {
    try {
      const ranges = getDateRanges();
      const start = period === 'week' ? ranges.weekStart : ranges.monthStart;
      const end = period === 'week' ? ranges.weekEnd : ranges.monthEnd;
      const lb = await getLeagueLeaderboard(leagueId, start, end);
      setLeaderboard(lb);
    } catch (err) {
      console.error(err);
    }
  }

  function showMsg(text) {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleApprove(userId) {
    try {
      await approveJoinRequest(leagueId, userId);
      showMsg('Member approved!');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleReject(userId) {
    try {
      await rejectJoinRequest(leagueId, userId);
      showMsg('Request rejected');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handlePromote(userId) {
    try {
      await promoteToAdmin(leagueId, userId);
      showMsg('Promoted to admin');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleDemote(userId) {
    try {
      await demoteFromAdmin(leagueId, userId);
      showMsg('Demoted to member');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleRemove(userId) {
    if (!confirm('Remove this member from the league?')) return;
    try {
      await rejectJoinRequest(leagueId, userId);
      showMsg('Member removed');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this league?')) return;
    try {
      await leaveLeague(leagueId, currentUser.uid);
      navigate('/leagues');
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleDelete() {
    try {
      await deleteLeague(leagueId);
      navigate('/leagues');
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleSearch(term) {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchApprovedUsers(term);
      const memberIds = new Set(members.map((m) => m.userId));
      setSearchResults(results.filter((u) => !memberIds.has(u.id) && u.id !== currentUser.uid));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleInviteUser(user) {
    try {
      await inviteUser(
        leagueId,
        league.name,
        { userId: user.id, email: user.email },
        currentUser.uid,
        userProfile?.nickname || userProfile?.displayName || 'Admin'
      );
      setSearchTerm('');
      setSearchResults([]);
      showMsg(`Invited ${user.nickname || user.displayName || user.email}`);
      const invites = await getLeagueInvites(leagueId);
      setPendingInvites(invites);
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleEmailInvite() {
    if (!emailInvite.trim() || !emailInvite.includes('@')) {
      showMsg('Please enter a valid email address');
      return;
    }
    try {
      await inviteUser(
        leagueId,
        league.name,
        { userId: null, email: emailInvite.trim() },
        currentUser.uid,
        userProfile?.nickname || userProfile?.displayName || 'Admin'
      );
      setEmailInvite('');
      showMsg(`Invitation sent to ${emailInvite.trim()}`);
      const invites = await getLeagueInvites(leagueId);
      setPendingInvites(invites);
    } catch (err) {
      showMsg(err.message);
    }
  }

  async function handleSaveEdit() {
    try {
      await updateLeague(leagueId, {
        name: editName.trim(),
        description: editDesc.trim(),
        visibility: editVisibility,
      });
      setShowEditModal(false);
      showMsg('League updated');
      loadLeague();
    } catch (err) {
      showMsg(err.message);
    }
  }

  function openEditModal() {
    setEditName(league.name);
    setEditDesc(league.description || '');
    setEditVisibility(league.visibility);
    setShowEditModal(true);
  }

  function getMedal(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  if (loading) return <div className="league-detail"><p>Loading...</p></div>;
  if (!league) return <div className="league-detail"><p>League not found.</p></div>;

  const pendingMembers = members.filter((m) => m.status === 'pending');
  const activeMembers = members.filter((m) => m.status === 'active');

  return (
    <div className="league-detail">
      <Link to="/leagues" className="back-link">&larr; Back to Leagues</Link>

      <div className="league-detail-header">
        <h1>{league.name}</h1>
        {league.description && <p>{league.description}</p>}
        <div className="league-detail-meta">
          <span className={`visibility-badge ${league.visibility}`}>{league.visibility}</span>
          <span style={{ color: '#6b7280', fontSize: 14 }}>👥 {league.memberCount || activeMembers.length} members</span>
          {myMembership && (
            <span className="role-pill">{myMembership.role}</span>
          )}
        </div>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('Cannot') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      {/* Last week's leader banner */}
      {lastWeekLeader && (
        <div className="leader-banner">
          <span className="trophy">🏆</span>
          <div className="banner-text">
            <strong>{lastWeekLeader.nickname}</strong>
            <p>Last week's champion!</p>
          </div>
          <span className="banner-steps">{lastWeekLeader.totalSteps?.toLocaleString()} steps</span>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16 }}>League Leaderboard</h3>
        <div className="period-toggle" style={{ marginBottom: 16 }}>
          <button className={`toggle-btn ${period === 'week' ? 'active' : ''}`} onClick={() => setPeriod('week')}>
            This Week
          </button>
          <button className={`toggle-btn ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>
            This Month
          </button>
        </div>

        {leaderboard.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <p>No activity data for this period.</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.userId}
                className={`leaderboard-item ${entry.userId === currentUser.uid ? 'is-you' : ''} ${index < 3 ? 'top-three' : ''}`}
              >
                <div className="rank">{getMedal(index)}</div>
                <div className="lb-avatar">
                  {entry.photoURL ? (
                    <img src={entry.photoURL} alt="" />
                  ) : (
                    <div className="avatar-sm">{entry.nickname[0]?.toUpperCase() || '?'}</div>
                  )}
                </div>
                <div className="lb-info">
                  <span className="lb-name">
                    {entry.nickname}
                    {entry.userId === currentUser.uid && <span className="you-badge">You</span>}
                  </span>
                  <span className="lb-subtitle">{entry.days} days · avg {entry.avgSteps.toLocaleString()}/day</span>
                </div>
                <div className="lb-steps">
                  <span className="lb-total">{entry.totalSteps.toLocaleString()}</span>
                  <span className="lb-unit">steps</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member actions */}
      {myMembership?.status === 'active' && !isAdmin && (
        <button className="btn btn-sm" onClick={handleLeave} style={{ marginBottom: 24 }}>
          Leave League
        </button>
      )}

      {/* Admin Section */}
      {isAdmin && (
        <div className="admin-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0 }}>League Management</h3>
            <button className="btn btn-sm" onClick={openEditModal}>Edit League</button>
          </div>

          <div className="leagues-tabs" style={{ marginBottom: 16 }}>
            <button className={adminTab === 'members' ? 'active' : ''} onClick={() => setAdminTab('members')}>
              Members ({activeMembers.length})
            </button>
            <button className={adminTab === 'pending' ? 'active' : ''} onClick={() => setAdminTab('pending')}>
              Pending {pendingMembers.length > 0 && <span className="tab-badge">{pendingMembers.length}</span>}
            </button>
            <button className={adminTab === 'invite' ? 'active' : ''} onClick={() => setAdminTab('invite')}>
              Invite
            </button>
          </div>

          {adminTab === 'members' && (
            <div>
              {activeMembers.map((member) => {
                const profile = memberProfiles[member.userId];
                return (
                  <div key={member.userId} className="member-item">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="" className="member-item-avatar" />
                    ) : (
                      <div className="member-item-avatar-placeholder">
                        {(profile?.nickname || profile?.displayName || '?')[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="member-item-info">
                      <div className="name">
                        {profile?.nickname || profile?.displayName || 'Unknown'}
                        {member.role === 'admin' && <span className="role-pill">admin</span>}
                        {member.userId === currentUser.uid && <span className="you-badge" style={{ marginLeft: 4 }}>You</span>}
                      </div>
                      <div className="email">{profile?.email}</div>
                    </div>
                    {member.userId !== currentUser.uid && (
                      <div className="member-item-actions">
                        {member.role === 'member' ? (
                          <>
                            <button className="btn btn-sm" onClick={() => handlePromote(member.userId)}>Promote</button>
                            <button className="btn btn-sm btn-reject" onClick={() => handleRemove(member.userId)}>Remove</button>
                          </>
                        ) : (
                          <button className="btn btn-sm" onClick={() => handleDemote(member.userId)}>Demote</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {adminTab === 'pending' && (
            <div>
              {pendingMembers.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}><p>No pending requests.</p></div>
              ) : (
                pendingMembers.map((member) => {
                  const profile = memberProfiles[member.userId];
                  return (
                    <div key={member.userId} className="member-item">
                      {profile?.photoURL ? (
                        <img src={profile.photoURL} alt="" className="member-item-avatar" />
                      ) : (
                        <div className="member-item-avatar-placeholder">
                          {(profile?.nickname || profile?.displayName || '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="member-item-info">
                        <div className="name">{profile?.nickname || profile?.displayName || 'Unknown'}</div>
                        <div className="email">{profile?.email}</div>
                      </div>
                      <div className="member-item-actions">
                        <button className="btn btn-sm btn-approve" onClick={() => handleApprove(member.userId)}>Approve</button>
                        <button className="btn btn-sm btn-reject" onClick={() => handleReject(member.userId)}>Reject</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {adminTab === 'invite' && (
            <div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Search existing users
                </label>
                <div className="invite-form">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name or email..."
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map((user) => (
                      <div key={user.id} className="search-result-item" onClick={() => handleInviteUser(user)}>
                        <span>{user.nickname || user.displayName || user.email}</span>
                        <span style={{ color: '#9ca3af', fontSize: 12, marginLeft: 'auto' }}>{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 14, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Invite by email (new or existing user)
                </label>
                <div className="invite-form">
                  <input
                    type="email"
                    value={emailInvite}
                    onChange={(e) => setEmailInvite(e.target.value)}
                    placeholder="Enter email address..."
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailInvite()}
                  />
                  <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={handleEmailInvite}>
                    Send Invite
                  </button>
                </div>
              </div>

              {pendingInvites.length > 0 && (
                <div>
                  <h4 style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Outstanding invitations</h4>
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className="member-item">
                      <div className="member-item-info">
                        <div className="name">{inv.invitedEmail}</div>
                        <div className="email">{inv.invitedUserId ? 'Existing user' : 'Not yet registered'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Danger zone */}
          <div className="danger-zone">
            <h3>Danger Zone</h3>
            <p>Deleting a league is permanent and cannot be undone. All members will be removed.</p>
            <button className="btn btn-reject" onClick={() => setShowDeleteConfirm(true)}>
              Delete League
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit League</h2>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15 }}
                maxLength={50}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 15, minHeight: 80, resize: 'vertical' }}
                maxLength={200}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Visibility</label>
              <div className="visibility-toggle">
                <button type="button" className={editVisibility === 'public' ? 'selected' : ''} onClick={() => setEditVisibility('public')}>
                  🌐 Public
                </button>
                <button type="button" className={editVisibility === 'private' ? 'selected' : ''} onClick={() => setEditVisibility('private')}>
                  🔒 Private
                </button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-sm" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Delete League</h2>
            <p style={{ marginBottom: 20, color: '#6b7280' }}>
              Are you sure you want to delete <strong>{league.name}</strong>? This action cannot be undone.
              All members will be removed and all league data will be lost.
            </p>
            <div className="modal-actions">
              <button className="btn btn-sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-reject" onClick={handleDelete}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
