import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  userId: number;
  username: string;
  email: string;
  avatar: string;
  daily_goal: number;
  level: number;
  exp: number;
  status?: string;
  autoStatus?: string;
  timeline_visibility?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (account: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string, avatar: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfile: (data: { username?: string; avatar?: string; daily_goal?: number; timeline_visibility?: string }) => Promise<{ success: boolean; message?: string }>;
  reloadUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Load current user profile if token is present
  const fetchUserProfile = async (jwtToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        // Token might be invalid/expired
        handleLogout();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const login = async (account: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || '登入失敗' };
      }
    } catch (error) {
      console.error('Login request error:', error);
      return { success: false, message: '網路連線異常，請稍後再試' };
    }
  };

  const register = async (username: string, email: string, password: string, avatar: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, avatar })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || '註冊失敗' };
      }
    } catch (error) {
      console.error('Registration request error:', error);
      return { success: false, message: '網路連線異常，請稍後再試' };
    }
  };

  const updateProfile = async (profileData: { username?: string; avatar?: string; daily_goal?: number; timeline_visibility?: string }) => {
    if (!token) return { success: false, message: '未登入' };

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || '更新設定失敗' };
      }
    } catch (error) {
      console.error('Update profile request error:', error);
      return { success: false, message: '網路連線異常，請稍後再試' };
    }
  };

  const reloadUserProfile = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout: handleLogout,
    updateProfile,
    reloadUserProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
