import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyInvites } from '../services/leagues';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);

  useEffect(() => {
    if (currentUser && userProfile?.status === 'approved') {
      getMyInvites(currentUser.uid)
        .then((invites) => setInviteCount(invites.length))
        .catch(() => {});
    }
  }, [currentUser, userProfile]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (!currentUser) return null;

  const isAdmin = userProfile?.role === 'admin';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">🏃 StepTracker</Link>
      </div>

      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? '✕' : '☰'}
      </button>

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
        <Link to="/leaderboard" onClick={() => setMenuOpen(false)}>Leaderboard</Link>
        <Link to="/leagues" onClick={() => setMenuOpen(false)} style={{ position: 'relative' }}>
          Leagues
          {inviteCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: 18, height: 18, padding: '0 5px', marginLeft: 4,
              borderRadius: 9, background: '#ef4444', color: 'white',
              fontSize: 11, fontWeight: 700, verticalAlign: 'middle',
            }}>{inviteCount}</span>
          )}
        </Link>
        <Link to="/stats" onClick={() => setMenuOpen(false)}>My Stats</Link>
        <Link to="/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
        {isAdmin && <Link to="/admin" className="admin-link" onClick={() => setMenuOpen(false)}>Admin</Link>}
        <button onClick={handleLogout} className="btn btn-sm mobile-logout">Logout</button>
      </div>

      <div className="navbar-user">
        {userProfile?.photoURL && (
          <img src={userProfile.photoURL} alt="" className="navbar-avatar" />
        )}
        <span className="navbar-name">
          {userProfile?.nickname || userProfile?.displayName || currentUser.email}
        </span>
        <button onClick={handleLogout} className="btn btn-sm">Logout</button>
      </div>
    </nav>
  );
}
