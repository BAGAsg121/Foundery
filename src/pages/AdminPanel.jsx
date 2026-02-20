import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css'; // Reusing dashboard styles for consistency

export default function AdminPanel() {
    const { getToken, logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };

            const [usersRes, rolesRes, logsRes] = await Promise.all([
                axios.get(`${API_URL}/auth/users`, { headers }),
                axios.get(`${API_URL}/auth/roles`, { headers }),
                axios.get(`${API_URL}/onboarding/admin/onboarding-logs`, { headers })
            ]);

            setUsers(usersRes.data);
            setRoles(rolesRes.data);
            setLogs(logsRes.data);
        } catch (err) {
            console.error('Error fetching admin data:', err);
            setError('Failed to load users.');
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApproveUser = async (userId) => {
        try {
            await axios.put(`${API_URL}/auth/approve/${userId}`, {}, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            // Update local state
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: 'active' } : u));
        } catch (err) {
            console.error('Error approving user:', err);
            alert('Failed to approve user');
        }
    };

    const handleRoleChange = async (userId, newRoleId) => {
        try {
            await axios.put(`${API_URL}/auth/users/${userId}/role`, { roleId: newRoleId }, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            // Update local state
            const roleName = roles.find(r => r.id === newRoleId)?.name;
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role_id: newRoleId, role: roleName } : u));
        } catch (err) {
            console.error('Error updating role:', err);
            alert('Failed to update role');
        }
    };

    return (
        <div className="dash">
            <header className="dash-header">
                <div className="dash-header__brand">
                    <div className="dash-header__logo" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                    </div>
                    <span className="dash-header__title">Admin Panel</span>
                </div>
                <div className="dash-header__actions">
                    <button className="dash-header__logout-btn" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
                </div>
            </header>

            <div className="dash-main" style={{ gridTemplateColumns: '1fr', padding: '40px' }}>
                <div className="dash-section-header">
                    <h2 className="dash-section-title">User Management</h2>
                    <button className="dash-card__btn dash-card__btn--approve" onClick={fetchData} style={{ width: 'auto', padding: '8px 16px' }}>
                        Refresh List
                    </button>
                </div>

                {loading ? (
                    <div className="dash-loading">Loading users...</div>
                ) : error ? (
                    <div className="dash-error">{error}</div>
                ) : (
                    <div className="dash-list" style={{ marginTop: '20px' }}>
                        {/* Header Row */}
                        <div className="dash-list__item" style={{ background: 'hsla(260, 20%, 25%, 0.6)', fontWeight: 'bold' }}>
                            <div style={{ flex: 2 }}>Email</div>
                            <div style={{ flex: 1 }}>Status</div>
                            <div style={{ flex: 1 }}>Role</div>
                            <div style={{ flex: 1 }}>Joined</div>
                            <div style={{ flex: 2, textAlign: 'right' }}>Actions</div>
                        </div>

                        {users.map(user => (
                            <div key={user.id} className="dash-list__item">
                                <div style={{ flex: 2, fontWeight: 500 }}>{user.email}</div>
                                <div style={{ flex: 1 }}>
                                    <span className={`dash-badge dash-badge--${user.status === 'active' ? 'completed' : 'pending'}`}>
                                        {user.status}
                                    </span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <select
                                        className="dash-header__search-input"
                                        style={{ padding: '4px 8px', borderRadius: '6px', width: 'auto' }}
                                        value={user.role_id}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    >
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ flex: 1, fontSize: '0.8rem', color: '#888' }}>
                                    {new Date(user.created_at).toLocaleDateString()}
                                </div>
                                <div style={{ flex: 2, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    {user.status === 'pending' && (
                                        <button
                                            className="dash-card__btn dash-card__btn--approve"
                                            onClick={() => handleApproveUser(user.id)}
                                        >
                                            Approve
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
