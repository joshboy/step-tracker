import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
