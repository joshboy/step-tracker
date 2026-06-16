import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAuth } from '../contexts/AuthContext';
import { getUserActivities, getDateRanges, computeAverages } from '../services/activities';
import { format, subDays } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Stats() {
  const { currentUser, userProfile } = useAuth();
  const [period, setPeriod] = useState('week');
  const [activities, setActivities] = useState([]);
  const [averages, setAverages] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [period]);

  async function loadStats() {
    setLoading(true);
    const ranges = getDateRanges();
    let start, end;

    switch (period) {
      case 'day':
        start = ranges.yesterday;
        end = ranges.today;
        break;
      case 'week':
        start = ranges.last7Start;
        end = ranges.today;
        break;
      case 'month':
        start = ranges.last30Start;
        end = ranges.today;
        break;
      case 'year':
        start = ranges.yearStart;
        end = ranges.today;
        break;
    }

    try {
      const data = await getUserActivities(currentUser.uid, start, end);
      setActivities(data);
      setAverages(computeAverages(data));
    } catch (err) {
      console.error('Error loading stats:', err);
    }
    setLoading(false);
  }

  const goal = userProfile?.stepGoal || 10000;

  const chartData = {
    labels: activities.map((a) => {
      const d = new Date(a.date + 'T00:00:00');
      return period === 'year'
        ? format(d, 'MMM d')
        : format(d, 'EEE, MMM d');
    }),
    datasets: [
      {
        label: 'Steps',
        data: activities.map((a) => a.steps),
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Goal',
        data: activities.map(() => goal),
        borderColor: '#e5e7eb',
        borderDash: [5, 5],
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (v) => v >= 1000 ? `${v / 1000}k` : v,
        },
      },
    },
  };

  return (
    <div className="stats-page">
      <h1>My Statistics</h1>

      <div className="period-toggle">
        {['day', 'week', 'month', 'year'].map((p) => (
          <button
            key={p}
            className={`toggle-btn ${period === p ? 'active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p === 'day' ? 'Yesterday' : `Last ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading stats...</div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <p>No activity data for this period.</p>
          <p>Log your steps from the dashboard to see your statistics here.</p>
        </div>
      ) : (
        <>
          <div className="stats-summary">
            <div className="card stat-card">
              <span className="stat-value">{averages.total.toLocaleString()}</span>
              <span className="stat-label">Total Steps</span>
            </div>
            <div className="card stat-card">
              <span className="stat-value">{averages.average.toLocaleString()}</span>
              <span className="stat-label">Daily Average</span>
            </div>
            <div className="card stat-card">
              <span className="stat-value">{averages.best.toLocaleString()}</span>
              <span className="stat-label">Best Day</span>
            </div>
            <div className="card stat-card">
              <span className="stat-value">{averages.days}</span>
              <span className="stat-label">Days Tracked</span>
            </div>
          </div>

          <div className="card chart-card">
            <h3>Steps Over Time</h3>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
