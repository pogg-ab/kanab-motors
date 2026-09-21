import React from 'react';
import { Search, Bell, Sparkles, Sun, Moon, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  currentModuleTitle: string;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentModuleTitle, onToggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <header className="navbar-header">
      {/* Left: Mobile Menu Hamburger & Current Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        {/* Mobile / Tablet Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          title="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-cyan)' }}>
          <Sparkles size={15} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            SIMS
          </span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
        </div>

        <h1 className="navbar-title">
          {currentModuleTitle}
        </h1>

        <span
          className="badge badge-cyan navbar-badge"
          style={{ padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 700 }}
        >
          Active
        </span>
      </div>

      {/* Center / Right: Quick Search, Live Tickers, Theme Toggle & User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Quick Search Bar */}
        <div className="navbar-search">
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              width: '100%',
            }}
          />
          <kbd
            className="navbar-search-kbd"
            style={{
              fontSize: '0.65rem',
              padding: '0.15rem 0.35rem',
              borderRadius: '4px',
              background: 'var(--bg-toggle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            ⌘K
          </kbd>
        </div>

        {/* Live NBE Rate Ticker */}
        <div className="navbar-ticker rate-ticker">
          <span>USD/ETB</span>
          <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>125.00</span>
        </div>

        {/* Theme Toggle Button (Light / Dark Mode) */}
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn navbar-theme-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle light and dark theme"
        >
          {theme === 'dark' ? (
            <>
              <div className="theme-icon-wrapper sun">
                <Sun size={13} />
              </div>
              <span className="theme-btn-label">Light Mode</span>
            </>
          ) : (
            <>
              <div className="theme-icon-wrapper moon">
                <Moon size={13} />
              </div>
              <span className="theme-btn-label">Dark Mode</span>
            </>
          )}
        </button>

        {/* Notification Bell */}
        <div className="navbar-bell-btn">
          <Bell size={15} />
          <div
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
            }}
          />
        </div>

        {/* User Profile & Sign Out */}
        <div className="navbar-user-pill">
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#031726',
              flexShrink: 0,
            }}
          >
            {user?.fullName
              ? user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)
              : 'KM'}
          </div>

          <div className="navbar-user-details" style={{ marginRight: '0.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, lineHeight: 1.1, color: 'var(--text-primary)' }}>
              {user?.fullName || 'Kanab Operator'}
            </div>
            <div style={{ fontSize: '0.64rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              {user?.role?.roleName || (user as any)?.roleName || 'Authenticated'}
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out of Session"
            aria-label="Sign Out"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-rose)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </header>
  );
};
