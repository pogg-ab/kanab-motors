import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AppUser } from '../api/client';

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email?: string; username?: string; password?: string }) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionKey: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('kanab_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('kanab_token') || null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // If token exists, verify current session or restore user
    const initAuth = async () => {
      const savedToken = localStorage.getItem('kanab_token');
      const savedUser = localStorage.getItem('kanab_user');
      if (savedToken && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        } catch {
          localStorage.removeItem('kanab_token');
          localStorage.removeItem('kanab_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: { email?: string; username?: string; password?: string }) => {
    const res = await api.login(credentials);
    setUser(res.user);
    setToken(res.access_token);
    localStorage.setItem('kanab_token', res.access_token);
    localStorage.setItem('kanab_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kanab_token');
    localStorage.removeItem('kanab_user');
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (!user) return false;
    if (user.role?.roleName === 'ADMIN' || user.permissions?.includes('ALL_PERMISSIONS')) {
      return true;
    }
    return user.permissions?.includes(permissionKey) || false;
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    return user.role?.roleName === roleName;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        loading,
        login,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
