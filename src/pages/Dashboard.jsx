import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { saveActivity, getActivity, getUserActivities, getDateRanges, computeAverages } from '../services/activities';
import { format, subDays } from 'date-fns';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [steps, setSteps] = useState('');
  const [savedSteps, setSavedSteps] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [weekStats, setWeekStats] = useState(null);
  const [todayActivity, setTodayActivity] = useState(null);

  useEffect(() => {
    loadActivity();
    loadWeekStats();
  }, [selectedDate]);

  async function loadActivity() {
    const activity = await getActivity(currentUser.uid, selectedDate);
    if (activity) {
      setSteps(String(activity.steps));
      setSavedSteps(activity.steps);
    } else {
      setSteps('');
      setSavedSteps(null);
    }
  }

  async function loadWeekStats() {
    const ranges = getDateRanges();
    const activities = await getUserActivities(currentUser.uid, ranges.weekStart, ranges.weekEnd);
    setWeekStats(computeAverages(activities));

    const today = await getActivity(currentUser.uid, ranges.yesterday);
    setTodayActivity(today);
  }

  async function handleSave(e) {
    e.preventDefault();
    const stepCount = parseInt(steps, 10);
    if (isNaN(stepCount) || stepCount < 0) {
      setMessage('Please enter a valid step count');
      return;
    }
    setSaving(true);
    try {
      await saveActivity(currentUser.uid, selectedDate, { steps: stepCount });
      setSavedSteps(stepCount);
      const ranges = getDateRanges();
      if (selectedDate === ranges.yesterday) {
        setTodayActivity({ steps: stepCount });
      }
      setMessage('Steps saved!');
      loadWeekStats();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error saving: ' + err.message);
    }
    setSaving(false);
  }

  const goal = userProfile?.stepGoal || 10000;
  const progressPct = todayActivity ? Math.min((todayActivity.steps / goal) * 100, 100) : 0;

  return (
    <div className="dashboard">
      <div className="welcome-section">
        <h1>Welcome, {userProfile?.nickname || userProfile?.displayName || 'there'}!</h1>
        <p className="date-display">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      <div className="dashboard-grid">
        <div className="card goal-card">
          <h3>Yesterday's Progress</h3>
          <div className="progress-ring-container">
            <svg className="progress-ring" viewBox="0 0 120 120">
              <circle className="progress-ring-bg" cx="60" cy="60" r="52" />
              <circle
                className="progress-ring-fill"
                cx="60" cy="60" r="52"
                strokeDasharray={`${(progressPct / 100) * 327} 327`}
              />
            </svg>
            <div className="progress-text">
              <span className="progress-steps">{todayActivity?.steps?.toLocaleString() || '—'}</span>
              <span className="progress-goal">/ {goal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="card stats-card">
          <h3>This Week</h3>
          {weekStats ? (
            <div className="quick-stats">
              <div className="stat">
                <span className="stat-value">{weekStats.total.toLocaleString()}</span>
                <span className="stat-label">Total Steps</span>
              </div>
              <div className="stat">
                <span className="stat-value">{weekStats.average.toLocaleString()}</span>
                <span className="stat-label">Daily Average</span>
              </div>
              <div className="stat">
                <span className="stat-value">{weekStats.best.toLocaleString()}</span>
                <span className="stat-label">Best Day</span>
              </div>
              <div className="stat">
                <span className="stat-value">{weekStats.days}</span>
                <span className="stat-label">Days Logged</span>
              </div>
            </div>
          ) : (
            <p>Loading...</p>
          )}
        </div>

        <div className="card entry-card">
          <h3>Log Steps</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <div className="form-group">
              <label>Step Count</label>
              <input
                type="number"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="e.g. 8500"
                min="0"
                max="200000"
              />
              {savedSteps !== null && (
                <small className="saved-info">Previously saved: {savedSteps.toLocaleString()} steps</small>
              )}
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {savedSteps !== null ? 'Update Steps' : 'Save Steps'}
            </button>
            {message && (
              <div className={`alert ${message.includes('Error') ? 'alert-error' : 'alert-success'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
