import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // Base API configuration
  axios.defaults.baseURL = API_BASE_URL;

  useEffect(() => {
    // Configure default headers
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Apply Theme stylesheet class
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Error fetching user profile:', error.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, requiredRole) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        if (requiredRole) {
          if (requiredRole === 'candidate' && user.role !== 'candidate') {
            const errorMsg = 'Administrators must log in using the Admin Portal.';
            toast.error(errorMsg);
            throw new Error(errorMsg);
          }
          if (requiredRole === 'admin' && user.role !== 'admin' && user.role !== 'superadmin') {
            const errorMsg = 'Candidates must log in using the Candidate Portal.';
            toast.error(errorMsg);
            throw new Error(errorMsg);
          }
        }

        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        toast.success(`Welcome back, ${user.name}!`);
        return user;
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Login failed. Please check credentials.';
      // Don't show toast again if we already showed it for role mismatch
      if (!error.message || (!error.message.includes('Admin Portal') && !error.message.includes('Candidate Portal'))) {
        toast.error(errorMsg);
      }
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out successfully.');
  };

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        login,
        logout,
        toggleTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
