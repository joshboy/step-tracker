import { useState, useEffect } from 'react';
import { getPendingUsers, getAllUsers, approveUser, rejectUser } from '../services/users';

export default function Admin() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const [pending, all] = await Promise.all([getPendingUsers(), getAllUsers()]);
    setPendingUsers(pending);
    setAllUsers(all);
    setLoading(false);
  }

  async function handleApprove(uid) {
    await approveUser(uid);
    loadUsers();
  }

  async function handleReject(uid) {
    await rejectUser(uid);
    loadUsers();
  }

  function formatDate(timestamp) {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString();
  }

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>

      <div className="period-toggle">
        <button
          className={`toggle-btn ${tab === 'pending' ? 'active' : ''}`}
          onClick={() => setTab('pending')}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          className={`toggle-btn ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          All Users ({allUsers.length})
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : tab === 'pending' ? (
        pendingUsers.length === 0 ? (
          <div className="empty-state">
            <p>No pending approvals.</p>
          </div>
        ) : (
          <div className="user-list">
            {pendingUsers.map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-item-avatar">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" />
                  ) : (
                    <div className="avatar-sm">
                      {(user.displayName || user.email)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="user-item-info">
                  <span className="user-item-name">{user.displayName || 'No name'}</span>
                  <span className="user-item-email">{user.email}</span>
                  <span className="user-item-date">Registered: {formatDate(user.createdAt)}</span>
                </div>
                <div className="user-item-actions">
                  <button onClick={() => handleApprove(user.id)} className="btn btn-approve">
                    Approve
                  </button>
                  <button onClick={() => handleReject(user.id)} className="btn btn-reject">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="user-list">
          {allUsers.map((user) => (
            <div key={user.id} className="user-item">
              <div className="user-item-avatar">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" />
                ) : (
                  <div className="avatar-sm">
                    {(user.displayName || user.email || '?')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="user-item-info">
                <span className="user-item-name">
                  {user.nickname || user.displayName || 'No name'}
                  {user.role === 'admin' && <span className="admin-badge">Admin</span>}
                </span>
                <span className="user-item-email">{user.email}</span>
                <span className="user-item-date">Joined: {formatDate(user.createdAt)}</span>
              </div>
              <div className="user-item-status">
                <span className={`status-badge status-${user.status}`}>{user.status}</span>
                {user.status !== 'approved' && user.role !== 'admin' && (
                  <button onClick={() => handleApprove(user.id)} className="btn btn-sm btn-approve">
                    Approve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
