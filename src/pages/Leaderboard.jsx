import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllActivities, getDateRanges, computeLeaderboard } from '../services/activities';
import { getAllUsers } from '../services/users';

export default function Leaderboard() {
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState('week');
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      const ranges = getDateRanges();
      const start = period === 'week' ? ranges.weekStart : ranges.monthStart;
      const end = period === 'week' ? ranges.weekEnd : ranges.monthEnd;

      const [activities, users] = await Promise.all([
        getAllActivities(start, end),
        getAllUsers(),
      ]);

      const approvedUsers = users.filter((u) => u.status === 'approved');
      setLeaderboard(computeLeaderboard(activities, approvedUsers));
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
    setLoading(false);
  }

  function getMedal(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  return (
    <div className="leaderboard-page">
      <h1>Leaderboard</h1>

      <div className="period-toggle">
        <button
          className={`toggle-btn ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >
          This Week
        </button>
        <button
          className={`toggle-btn ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          This Month
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state">
          <p>No activity data for this period yet.</p>
          <p>Start logging your steps to appear on the leaderboard!</p>
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
                <span className="lb-subtitle">{entry.days} days logged · avg {entry.avgSteps.toLocaleString()}/day</span>
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
  );
}
