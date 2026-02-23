import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

export default function Dashboard() {
  const { isAdmin, logout: handleLogout, getToken, user } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [stats, setStats] = useState({ funnel: { mobile_verified: 0, email_verified: 0, pan_verified: 0, final_confirmed: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  console.log('Using API_URL:', API_URL);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, usersRes, statsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/onboarding/admin/onboardings`, { headers }),
        axios.get(`${API_URL}/auth/pending-users`, { headers }),
        axios.get(`${API_URL}/onboarding/admin/dashboard-stats`, { headers })
      ]);

      // Check for errors in the individual requests
      const errors = [subRes, usersRes, statsRes]
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message || 'Unknown error');

      if (errors.length > 0) {
        console.error('Some requests failed:', errors);
        setError(`Failed to load some data: ${errors.join(', ')}`);
      }

      if (subRes.status === 'fulfilled') setSubmissions(subRes.value.data || []);
      if (usersRes.status === 'fulfilled') setPendingUsers(usersRes.value.data || []);
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || { funnel: { mobile_verified: 0, email_verified: 0, pan_verified: 0, final_confirmed: 0 } });
      }
    } catch (err) {
      console.error('Critical error fetching data:', err);
      setError('A critical error occurred while loading data.');
      if (err.response?.status === 401) {
        handleLogout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin()) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const handleRefresh = () => fetchData();
  const handleFeatureNotImplemented = (featureName) => alert(`${featureName} feature is coming soon!`);

  const handleApproveUser = async (userId) => {
    try {
      await axios.put(`${API_URL}/auth/approve/${userId}`, {}, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="dash-access-denied">
        <h1 className="dash-access-denied__title">Access Denied</h1>
        <p className="dash-access-denied__sub">You do not have admin access to view this page.</p>
        <div className="dash-access-denied__actions">
          <button className="dash-access-denied__btn" onClick={() => navigate('/onboarding')}>Go to Onboarding</button>
          <button className="dash-access-denied__btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash">
      {/* HEADER */}
      <header className="dash-header">
        <div className="dash-header__brand">
          <div className="dash-header__logo">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="dash-header__title">Go-Live Admin</span>
        </div>

        <div className="dash-header__search">
          <svg className="dash-header__search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="dash-header__search-input" type="text" placeholder="Search submissions..." />
        </div>

        <div className="dash-header__actions">
          <div className="dash-header__user">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {user?.email || 'Admin'}
          </div>
          <button className="dash-header__logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* BODY */}
      <div className="dash-body">

        {/* SIDEBAR */}
        <nav className="dash-sidebar">
          <div className="dash-sidebar__icon dash-sidebar__icon--active" title="Dashboard" onClick={handleRefresh}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>

          <div className="dash-sidebar__icon" title="Onboarding Form" onClick={() => navigate('/onboarding')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="dash-sidebar__icon" title="Users" onClick={() => navigate('/admin')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>

          <div className="dash-sidebar__icon" title="Analytics" onClick={() => handleFeatureNotImplemented('Analytics')}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          <div className="dash-sidebar__spacer" />

          <div className="dash-sidebar__icon dash-sidebar__icon--danger" title="Logout" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="dash-main">

          {/* STATS ROW — full width across top */}
          <div className="dash-stats">
            <div className="dash-stat dash-stat--total">
              <div className="dash-stat__value">{stats.funnel?.mobile_verified || 0}</div>
              <div className="dash-stat__label">Mobile Verified</div>
            </div>
            <div className="dash-stat dash-stat--pending">
              <div className="dash-stat__value">{stats.funnel?.email_verified || 0}</div>
              <div className="dash-stat__label">Email Verified</div>
            </div>
            <div className="dash-stat dash-stat--completed">
              <div className="dash-stat__value">{stats.funnel?.pan_verified || 0}</div>
              <div className="dash-stat__label">PAN Verified</div>
            </div>
            <div className="dash-stat">
              <div className="dash-stat__value">{stats.funnel?.final_confirmed || 0}</div>
              <div className="dash-stat__label">Full Submission</div>
            </div>
          </div>

          {/* TWO COLUMNS — Recent Submissions | Onboarding Submissions */}
          <div className="dash-columns">

            {/* COL-1: Recent Submissions */}
            <div className="dash-col1">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Recent Submissions</h2>
              </div>

              {loading ? (
                <div className="dash-loading">Loading...</div>
              ) : error ? (
                <div className="dash-error">{error}</div>
              ) : submissions.length === 0 ? (
                <div className="dash-empty">No submissions yet</div>
              ) : (
                <ul className="dash-list">
                  {submissions.slice(0, 8).map(sub => (
                    <li key={sub.id} className="dash-list__item">
                      <div className="dash-list__info">
                        <span className="dash-list__email">{sub.email || 'N/A'}</span>
                        <span className="dash-list__date">
                          {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <span className={`dash-badge dash-badge--${sub.status || 'pending'}`}>
                        {sub.status || 'pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Pending Users */}
              {pendingUsers.length > 0 && (
                <div className="dash-pending-users">
                  <h3 className="dash-pending-users__title">
                    Pending User Approvals ({pendingUsers.length})
                  </h3>
                  <ul className="dash-pending-users__list">
                    {pendingUsers.map(u => (
                      <li key={u.id} className="dash-pending-user">
                        <span className="dash-pending-user__email">{u.email}</span>
                        <button className="dash-pending-user__btn" onClick={() => handleApproveUser(u.id)}>
                          Approve
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* COL-2: Onboarding Submission Cards */}
            <div className="dash-col2">
              <div className="dash-section-header">
                <h2 className="dash-section-title">Onboarding Submissions</h2>
              </div>

              {!loading && submissions.length === 0 && (
                <div className="dash-empty">No submissions yet</div>
              )}

              {!loading && submissions.length > 0 && (
                <ul className="dash-cards">
                  {submissions.slice(0, 6).map((sub, idx) => (
                    <li
                      key={sub.id}
                      className="dash-card"
                      style={{ '--card-hue': [36, 44, 48, 40, 32, 28][idx % 6] }}
                    >
                      <div className="dash-card__header">
                        <span className="dash-card__org">{sub.org_name || 'No Org'}</span>
                        <span className={`dash-badge dash-badge--${sub.status || 'pending'}`}>
                          {sub.status || 'pending'}
                        </span>
                      </div>
                      <div className="dash-card__body">
                        <div className="dash-card__row">
                          <span className="dash-card__label">Email</span>
                          <span className="dash-card__value">{sub.email || 'N/A'}</span>
                        </div>
                        <div className="dash-card__row">
                          <span className="dash-card__label">Mobile</span>
                          <span className="dash-card__value">{sub.mobile || 'N/A'}</span>
                        </div>
                        <div className="dash-card__row">
                          <span className="dash-card__label">PAN</span>
                          <span className="dash-card__value">{sub.pan || 'N/A'}</span>
                        </div>
                      </div>
                      {sub.status === 'pending' && (
                        <div className="dash-card__actions">
                          <button className="dash-card__btn dash-card__btn--approve">Approve</button>
                          <button className="dash-card__btn dash-card__btn--reject">Reject</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}