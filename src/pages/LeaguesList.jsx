import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyLeagues,
  getPublicLeagues,
  getMyInvites,
  requestToJoin,
  acceptInvite,
  declineInvite,
  getMembership,
} from '../services/leagues';
import './leagues.css';

export default function LeaguesList() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('my');
  const [myLeagues, setMyLeagues] = useState([]);
  const [publicLeagues, setPublicLeagues] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [joiningId, setJoiningId] = useState(null);
  const [myMemberships, setMyMemberships] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [leagues, inv] = await Promise.all([
        getMyLeagues(currentUser.uid),
        getMyInvites(currentUser.uid),
      ]);
      setMyLeagues(leagues);
      setInvites(inv);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function loadPublicLeagues() {
    try {
      const all = await getPublicLeagues();
      setPublicLeagues(all);

      const memberships = {};
      await Promise.all(
        all.map(async (league) => {
          const m = await getMembership(league.id, currentUser.uid);
          if (m) memberships[league.id] = m.status;
        })
      );
      setMyMemberships(memberships);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (tab === 'browse') loadPublicLeagues();
  }, [tab]);

  async function handleJoin(leagueId) {
    setJoiningId(leagueId);
    try {
      await requestToJoin(leagueId, currentUser.uid);
      setMyMemberships((prev) => ({ ...prev, [leagueId]: 'pending' }));
      setMessage('Join request sent!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 3000);
    }
    setJoiningId(null);
  }

  async function handleAcceptInvite(invite) {
    try {
      await acceptInvite(invite.id, invite.leagueId, currentUser.uid);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
      loadData();
      setMessage('Joined league!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function handleDeclineInvite(invite) {
    try {
      await declineInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      setMessage(err.message);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  if (loading) return <div className="leagues-page"><p>Loading...</p></div>;

  return (
    <div className="leagues-page">
      <div className="leagues-header">
        <h1>Leagues</h1>
        <button className="btn btn-primary" onClick={() => navigate('/leagues/create')} style={{ width: 'auto', padding: '10px 20px' }}>
          + Create League
        </button>
      </div>

      {message && (
        <div className={`alert ${message.includes('Error') || message.includes('Already') || message.includes('full') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 16 }}>
          {message}
        </div>
      )}

      <div className="leagues-tabs">
        <button className={tab === 'my' ? 'active' : ''} onClick={() => setTab('my')}>
          My Leagues
        </button>
        <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>
          Browse Public
        </button>
        <button className={tab === 'invites' ? 'active' : ''} onClick={() => setTab('invites')}>
          Invites
          {invites.length > 0 && <span className="tab-badge">{invites.length}</span>}
        </button>
      </div>

      {tab === 'my' && (
        myLeagues.length > 0 ? (
          <div className="leagues-grid">
            {myLeagues.map((league) => (
              <Link to={`/leagues/${league.id}`} key={league.id} className="league-card">
                <h3>
                  {league.name}
                  <span className="role-pill">{league.myRole}</span>
                </h3>
                <div className="league-card-meta">
                  <span>👥 {league.memberCount || 0} member{(league.memberCount || 0) !== 1 ? 's' : ''}</span>
                  <span className={`visibility-badge ${league.visibility}`}>{league.visibility}</span>
                </div>
                {league.description && <p>{league.description}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't joined any leagues yet.</p>
            <button className="btn btn-primary" onClick={() => setTab('browse')} style={{ width: 'auto', padding: '10px 24px' }}>
              Browse Public Leagues
            </button>
          </div>
        )
      )}

      {tab === 'browse' && (
        publicLeagues.length > 0 ? (
          <div className="leagues-grid">
            {publicLeagues.map((league) => (
              <div key={league.id} className="league-card">
                <div className="browse-card">
                  <div className="browse-card-info">
                    <h3>{league.name}</h3>
                    <div className="league-card-meta">
                      <span>👥 {league.memberCount || 0}/{50}</span>
                    </div>
                    {league.description && <p>{league.description}</p>}
                  </div>
                  <div>
                    {myMemberships[league.id] === 'active' ? (
                      <button className="btn btn-sm" disabled style={{ opacity: 0.6 }}>Joined</button>
                    ) : myMemberships[league.id] === 'pending' ? (
                      <button className="btn btn-sm" disabled style={{ opacity: 0.6 }}>Pending</button>
                    ) : (league.memberCount || 0) >= 50 ? (
                      <button className="btn btn-sm" disabled style={{ opacity: 0.6 }}>Full</button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '8px 16px' }}
                        disabled={joiningId === league.id}
                        onClick={() => handleJoin(league.id)}
                      >
                        {joiningId === league.id ? 'Joining...' : 'Request to Join'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No public leagues available.</p>
          </div>
        )
      )}

      {tab === 'invites' && (
        invites.length > 0 ? (
          invites.map((invite) => (
            <div key={invite.id} className="invite-card">
              <div className="invite-info">
                <h4>{invite.leagueName}</h4>
                <p>Invited by {invite.invitedByName}</p>
              </div>
              <div className="invite-actions">
                <button className="btn btn-approve" onClick={() => handleAcceptInvite(invite)}>Accept</button>
                <button className="btn btn-reject" onClick={() => handleDeclineInvite(invite)}>Decline</button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <p>No pending invitations.</p>
          </div>
        )
      )}
    </div>
  );
}
