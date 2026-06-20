import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../services/users';

export default function Profile() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    nickname: userProfile?.nickname || '',
    height: userProfile?.height || '',
    weight: userProfile?.weight || '',
    stepGoal: userProfile?.stepGoal || 10000,
    targetWeight: userProfile?.targetWeight || '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        nickname: form.nickname,
        height: form.height ? Number(form.height) : null,
        weight: form.weight ? Number(form.weight) : null,
        stepGoal: Number(form.stepGoal) || 10000,
        targetWeight: form.targetWeight ? Number(form.targetWeight) : null,
      });
      await refreshProfile();
      setMessage('Profile updated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error: ' + err.message);
    }
    setSaving(false);
  }

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      <div className="profile-grid">
        <div className="card photo-card">
          <div className="photo-section">
            <div className="avatar-large">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="Profile" />
              ) : (
                <div className="avatar-placeholder">
                  {(userProfile?.nickname || userProfile?.displayName || '?')[0].toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <div className="profile-info">
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Status:</strong> <span className={`status-badge status-${userProfile?.status}`}>{userProfile?.status}</span></p>
            <p><strong>Member since:</strong> {userProfile?.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}</p>
          </div>
        </div>

        <div className="card">
          <h3>Edit Profile</h3>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Nickname</label>
              <input
                type="text"
                name="nickname"
                value={form.nickname}
                onChange={handleChange}
                placeholder="Your display nickname"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={form.height}
                  onChange={handleChange}
                  placeholder="170"
                  min="50"
                  max="300"
                />
              </div>
              <div className="form-group">
                <label>Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  placeholder="70"
                  min="20"
                  max="500"
                  step="0.1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Daily Step Goal</label>
                <input
                  type="number"
                  name="stepGoal"
                  value={form.stepGoal}
                  onChange={handleChange}
                  min="1000"
                  max="100000"
                  step="500"
                />
              </div>
              <div className="form-group">
                <label>Target Weight (kg)</label>
                <input
                  type="number"
                  name="targetWeight"
                  value={form.targetWeight}
                  onChange={handleChange}
                  placeholder="65"
                  min="20"
                  max="500"
                  step="0.1"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Profile'}
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
