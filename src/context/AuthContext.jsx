import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // Rest of your AuthProvider code...

  // API base URL from environment variables or default to localhost
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Initialize auth state
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and fetch user data
      verifyToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Verify JWT token
  const verifyToken = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.user) {
        setUser(response.data.user);
        // If your backend returns roles and permissions in the user object:
        if (response.data.user.roles) {
          setUserRole(response.data.user.roles[0]?.name || response.data.user.roles[0]);
        }
        if (response.data.user.permissions) {
          setPermissions(response.data.user.permissions);
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });

      const { token, user } = response.data;

      // Store token in localStorage
      localStorage.setItem('token', token);

      // Set user state
      setUser(user);
      if (user.roles && user.roles.length > 0) {
        setUserRole(user.roles[0]);
      }
      if (user.permissions && user.permissions.length > 0) {
        setPermissions(user.permissions);
      }

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please try again.'
      };
    }
  };
  // Logout function
  const logout = () => {
    // Clear token from localStorage
    localStorage.removeItem('token');
    // Reset state
    setUser(null);
    setUserRole(null);
    setPermissions([]);
  };

  // Check if user has admin role
  const isAdmin = () => {
    return userRole === 'admin';
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return userRole === role;
  };

  // Check if user has a specific permission
  const hasPermission = (permission) => {
    return permissions.includes(permission);
  };

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!localStorage.getItem('token');
  };

  const value = {
    user,
    loading,
    userRole,
    permissions,
    login,
    logout,
    isAdmin,
    hasRole,
    hasPermission,
    getToken,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
