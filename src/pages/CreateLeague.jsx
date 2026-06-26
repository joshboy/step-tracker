import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createLeague } from '../services/leagues';
import './leagues.css';

export default function CreateLeague() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('League name is required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const leagueId = await createLeague(currentUser.uid, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      navigate(`/leagues/${leagueId}`);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="leagues-page">
      <Link to="/leagues" className="back-link">&larr; Back to Leagues</Link>
      <h1>Create a League</h1>

      <form className="create-league-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="league-name">League Name *</label>
          <input
            id="league-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend Warriors"
            maxLength={50}
          />
        </div>

        <div className="form-group">
          <label htmlFor="league-desc">Description</label>
          <textarea
            id="league-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what this league is about..."
            maxLength={200}
          />
        </div>

        <div className="form-group">
          <label>Visibility</label>
          <div className="visibility-toggle">
            <button
              type="button"
              className={visibility === 'public' ? 'selected' : ''}
              onClick={() => setVisibility('public')}
            >
              🌐 Public
            </button>
            <button
              type="button"
              className={visibility === 'private' ? 'selected' : ''}
              onClick={() => setVisibility('private')}
            >
              🔒 Private
            </button>
          </div>
          <small style={{ color: '#6b7280', marginTop: 6, display: 'block', fontSize: 13 }}>
            {visibility === 'public'
              ? 'Anyone can find and request to join this league.'
              : 'Members can only join via admin invitation.'}
          </small>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'Creating...' : 'Create League'}
        </button>
      </form>
    </div>
  );
}
