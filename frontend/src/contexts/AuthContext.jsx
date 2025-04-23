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
      console.log('로그인 데이터:', data);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      console.log('변환된 사용자 데이터:', userData);
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
      console.log('회원가입 데이터:', data);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      console.log('변환된 사용자 데이터:', userData);
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
      console.log('구글 로그인 데이터:', data);
      const userData = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name
      };
      console.log('변환된 사용자 데이터:', userData);
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