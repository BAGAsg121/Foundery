import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Load the Spline viewer script once
  useEffect(() => {
    if (!document.querySelector('script[src*="splinetool"]')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.12.58/build/spline-viewer.js';
      document.head.appendChild(script);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { success, message } = await login(email, password);
        if (!success) {
          setError(message || 'Login failed.');
        } else {
          navigate('/dashboard');
        }
      } else {
        await axios.post(`${API_URL}/auth/signup`, { email, password });
        setSuccessMsg('Account created! Please wait for admin approval.');
        setIsLogin(true);
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT — Spline 3D Animation */}
      <div className="auth-spline">
        <spline-viewer url="https://prod.spline.design/L9-x9ViTo63BTJzP/scene.splinecode"></spline-viewer>
      </div>

      {/* RIGHT — Login Form */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h1 className="main-title">Go-Live Admin</h1>
          <h2 className="sub-heading">Eloka Assistance Tool</h2>

          <div className="login-container">
            <div className="login-form">
              <h3>{isLogin ? 'Login' : 'Sign Up'}</h3>

              {error && <div className="error-message">{error}</div>}
              {successMsg && <div className="success-message">{successMsg}</div>}

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className="login-button">
                  {loading ? 'Processing...' : (isLogin ? 'Login' : 'Sign Up')}
                </button>
              </form>

              <div className="toggle-auth">
                <p>
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    className="text-btn"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setSuccessMsg('');
                    }}
                  >
                    {isLogin ? 'Sign Up' : 'Login'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}