// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import * as auth from '@/services/auth';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const data = await auth.login(email, password);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
    } catch (err) {
      console.error('로그인 에러:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    try {
      setLoading(true);
      setError(null);
      const data = await auth.register(email, password, name);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
    } catch (err) {
      console.error('회원가입 에러:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    try {
      setLoading(true);
      setError(null);
      const data = await auth.loginWithGoogle(credential);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('userId', userData.id);
    } catch (err) {
      console.error('구글 로그인 에러:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    auth.logout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}