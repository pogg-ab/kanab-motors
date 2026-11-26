import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, AppUser, setOnUnauthorizedCallback } from '../api/client';

export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp - 5) * 1000;
  } catch {
    return false;
  }
}

export function getJwtMsUntilExpiry(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return null;
    return payload.exp * 1000 - Date.now();
  } catch {
    return null;
  }
}

interface AuthContextType {
  user: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email?: string; username?: string; password?: string }) => Promise<void>;
  logout: (isExpired?: boolean | unknown) => void;
  hasPermission: (permissionKey: string) => boolean;
  hasRole: (roleName: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('kanab_user');
      const savedToken = localStorage.getItem('kanab_token');
      if (savedToken && isJwtExpired(savedToken)) {
        return null;
      }
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('kanab_token');
    if (savedToken && isJwtExpired(savedToken)) {
      return null;
    }
    return savedToken || null;
  });

  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback((isExpired?: boolean | unknown) => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('kanab_token');
    localStorage.removeItem('kanab_user');
    localStorage.removeItem('kanab_active_tab');
    sessionStorage.removeItem('kanab_admin_navigated');
    if (isExpired === true) {
      sessionStorage.setItem('kanab_session_expired', 'Your session has expired. Please log in again to continue.');
    } else {
      sessionStorage.removeItem('kanab_session_expired');
    }
  }, []);

  useEffect(() => {
    // If token exists, verify current session or restore user
    const initAuth = async () => {
      const savedToken = localStorage.getItem('kanab_token');
      const savedUser = localStorage.getItem('kanab_user');
      if (savedToken && savedUser) {
        if (isJwtExpired(savedToken)) {
          logout(true);
        } else {
          try {
            setUser(JSON.parse(savedUser));
            setToken(savedToken);
          } catch {
            logout(false);
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [logout]);

  // Proactive auto-logout timer when token expires in real-time
  useEffect(() => {
    if (!token) return;
    const msUntilExpiry = getJwtMsUntilExpiry(token);
    if (msUntilExpiry !== null) {
      if (msUntilExpiry <= 0) {
        logout(true);
        return;
      }
      const timer = setTimeout(() => {
        logout(true);
      }, msUntilExpiry);
      return () => clearTimeout(timer);
    }
  }, [token, logout]);

  // Reactive logout on 401 Unauthorized API responses
  useEffect(() => {
    const handleUnauthorized = () => {
      logout(true);
    };

    setOnUnauthorizedCallback(handleUnauthorized);
    window.addEventListener('kanab_auth_logout', handleUnauthorized);

    return () => {
      setOnUnauthorizedCallback(null);
      window.removeEventListener('kanab_auth_logout', handleUnauthorized);
    };
  }, [logout]);

  const login = async (credentials: { email?: string; username?: string; password?: string }) => {
    const res = await api.login(credentials);
    setUser(res.user);
    setToken(res.access_token);
    localStorage.setItem('kanab_token', res.access_token);
    localStorage.setItem('kanab_user', JSON.stringify(res.user));
    sessionStorage.removeItem('kanab_session_expired');
    // Super Admin / Admin default opening page is always Executive Dashboard
    if (res.user.role?.roleName === 'ADMIN' || res.user.role?.roleName === 'SUPER_ADMIN' || res.user.permissions?.includes('ALL_PERMISSIONS')) {
      localStorage.setItem('kanab_active_tab', 'dashboard');
    }
    sessionStorage.removeItem('kanab_admin_navigated');
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
