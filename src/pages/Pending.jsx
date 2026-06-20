import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Pending() {
  const { userProfile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  async function handleCheckStatus() {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  }

  if (userProfile?.status === 'approved') {
    navigate('/');
    return null;
  }

  if (userProfile?.status === 'rejected') {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Account Rejected</h1>
          <p>Your account request has been rejected by the administrator.</p>
          <p>Please contact the admin if you believe this is a mistake.</p>
          <button onClick={logout} className="btn btn-primary">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Pending Approval</h1>
        <p>Your account is awaiting admin approval.</p>
        <p>You'll be able to use StepTracker once an administrator approves your registration.</p>
        <div className="pending-actions">
          <button onClick={handleCheckStatus} disabled={checking} className="btn btn-primary">
            {checking ? 'Checking...' : 'Check Status'}
          </button>
          <button onClick={logout} className="btn btn-secondary">Sign Out</button>
        </div>
      </div>
    </div>
  );
}
