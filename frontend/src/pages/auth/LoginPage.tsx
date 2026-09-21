import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface DemoAccount {
  roleName: string;
  badgeClass: string;
  name: string;
  email: string;
  pass: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    roleName: 'ADMIN',
    badgeClass: 'badge-purple',
    name: 'System Administrator',
    email: 'admin@kanabmotors.com',
    pass: 'Admin@123',
    desc: 'Unrestricted enterprise privileges',
  },
  {
    roleName: 'FINANCE_MANAGER',
    badgeClass: 'badge-emerald',
    name: 'Dawit Finance Director',
    email: 'finance@kanabmotors.com',
    pass: 'Finance@123',
    desc: 'Ledger adjustments & refunds',
  },
  {
    roleName: 'PROCUREMENT',
    badgeClass: 'badge-blue',
    name: 'Tewodros Import Logistics',
    email: 'procurement@kanabmotors.com',
    pass: 'Procure@123',
    desc: 'POs, shipments & landed cost',
  },
  {
    roleName: 'INVENTORY',
    badgeClass: 'badge-cyan',
    name: 'Kassahun Inventory Lead',
    email: 'inventory@kanabmotors.com',
    pass: 'Inventory@123',
    desc: 'Stock units, chassis & VIN',
  },
  {
    roleName: 'SALES_MANAGER',
    badgeClass: 'badge-amber',
    name: 'Selamawit Sales Director',
    email: 'sales@kanabmotors.com',
    pass: 'Sales@123',
    desc: 'Enquiries, quotes & bookings',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('admin@kanabmotors.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: any) {
      setError(
        err.response?.data?.message || err.message || 'Invalid email/username or password',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = async (demo: DemoAccount, autoSubmit: boolean = false) => {
    setEmail(demo.email);
    setPassword(demo.pass);
    setError(null);

    if (autoSubmit) {
      setLoading(true);
      try {
        await login({ email: demo.email, password: demo.pass });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to authenticate demo user');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem 1rem',
      position: 'relative',
      background: 'var(--bg-primary)',
      transition: 'background-color 0.25s ease',
    }}>
      {/* Top Navbar Bar: Brand & Theme Toggle */}
      <div style={{
        position: 'absolute',
        top: '1.25rem',
        right: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <button
          onClick={toggleTheme}
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <div className={`theme-icon-wrapper ${theme === 'dark' ? 'sun' : 'moon'}`}>
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </div>
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))',
            boxShadow: '0 8px 24px -4px rgba(79, 70, 229, 0.4)',
            marginBottom: '1rem',
            color: '#ffffff',
          }}>
            <ShieldCheck size={28} />
          </div>

          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: '0 0 0.4rem 0',
          }}>
            KANAB MOTORS
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            margin: 0,
            fontWeight: 500,
          }}>
            Enterprise Sales, Inventory & Customer Management
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{
          padding: '2.25rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          border: '1px solid var(--border-color)',
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.35rem 0' }}>
              Sign In to Your Workspace
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              Enter your corporate credentials or choose a demo role below.
            </p>
          </div>

          {error && (
            <div className="alert-banner-danger">
              <AlertCircle size={18} />
              <span style={{ fontWeight: 600 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} color="var(--accent-cyan)" />
                Corporate Email or Username *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. admin@kanabmotors.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} color="var(--accent-indigo)" />
                  Password *
                </label>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '2.75rem' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.25rem',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn size={18} /> Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div style={{
            marginTop: '1.75rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}>
                <Sparkles size={13} color="var(--accent-amber)" />
                Client Presentation Roles
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click to 1-Click Login</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {DEMO_ACCOUNTS.map((d) => (
                <button
                  key={d.roleName}
                  type="button"
                  onClick={() => handleSelectDemo(d, true)}
                  style={{
                    padding: '0.55rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  className="demo-account-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge ${d.badgeClass}`} style={{ fontSize: '0.68rem', padding: '0.2rem 0.5rem' }}>
                      {d.roleName.replace(/_/g, ' ')}
                    </span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {d.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {d.email}
                      </div>
                    </div>
                  </div>
                  <CheckCircle2 size={15} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security & System Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}>
          <ShieldCheck size={14} color="var(--accent-emerald)" />
          <span>Role-Based Access Control & Tamper-Proof Audit Active</span>
        </div>
      </div>
    </div>
  );
};
