import React from 'react';
import {
  Users,
  Package,
  CarFront,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  Bookmark,
  Receipt,
  Coins,
  Ship,
  ClipboardList,
  Building2,
  BarChart3,
  UserCog,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const procurementItems = [
    {
      id: 'shipments',
      label: 'Shipments & Landed Cost',
      module: 'Logistics',
      icon: Ship,
      badge: 'Engine',
    },
    {
      id: 'purchase-orders',
      label: 'Purchase Orders',
      module: 'Procurement',
      icon: ClipboardList,
      badge: 'Orders',
    },
    {
      id: 'suppliers',
      label: 'Suppliers Master',
      module: 'Vendor',
      icon: Building2,
      badge: 'Global',
    },
    {
      id: 'procurement-reports',
      label: 'Import Pipeline & Reports',
      module: 'Analytics',
      icon: BarChart3,
      badge: 'BI',
    },
  ];

  const masterItems = [
    {
      id: 'customers',
      label: 'Customers & Dealers',
      module: 'Directory',
      icon: Users,
      badge: 'Core',
    },
    {
      id: 'products',
      label: 'Product Master Data',
      module: 'Inventory',
      icon: Package,
      badge: 'Catalog',
    },
    {
      id: 'vehicles',
      label: 'Vehicle Units & Chassis',
      module: 'Registry',
      icon: CarFront,
      badge: 'Tracking',
    },
  ];

  const financialItems = [
    {
      id: 'statement',
      label: 'Customer Ledger & SOA',
      module: 'Ledger',
      icon: FileSpreadsheet,
      badge: 'Ledger',
    },
    {
      id: 'enquiries',
      label: 'Sales Enquiries & Quotes',
      module: 'Pipeline',
      icon: FileText,
      badge: 'CRM',
    },
    {
      id: 'bookings',
      label: 'Advance Bookings',
      module: 'Orders',
      icon: Bookmark,
      badge: 'Queue',
    },
    {
      id: 'payments',
      label: 'BRV Receipts & Deposits',
      module: 'Finance',
      icon: Receipt,
      badge: 'Inflow',
    },
    {
      id: 'settlement',
      label: 'Excess & Refund Payouts',
      module: 'Refunds',
      icon: Coins,
      badge: 'Audit',
    },
  ];

  const systemItems = [
    {
      id: 'users',
      label: 'Users & Permissions',
      module: 'RBAC',
      icon: UserCog,
      badge: 'Access',
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      module: 'System',
      icon: ShieldCheck,
      badge: 'Audit',
    },
  ];

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (onClose) {
      onClose();
    }
  };

  const renderNavSection = (title: string, items: typeof masterItems) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <div
        style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: 'var(--text-muted)',
          padding: '0.4rem 0.75rem',
          letterSpacing: '0.06em',
        }}
      >
        {title}
      </div>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`sidebar-nav-btn ${isActive ? 'active' : ''}`}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: isActive ? 'rgba(0, 210, 211, 0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(0, 210, 211, 0.35)' : '1px solid transparent',
              borderLeft: isActive ? '3px solid var(--accent-cyan)' : '3px solid transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              marginBottom: '0.25rem',
              transition: 'all 0.15s ease',
              textAlign: 'left',
              boxShadow: isActive ? '0 0 15px -3px rgba(0, 210, 211, 0.2)' : 'none',
            }}
          >
            <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: isActive ? 700 : 500, fontSize: '0.84rem' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                {item.module}
              </div>
            </div>
            <span
              className={`badge ${isActive ? 'badge-cyan' : 'badge-subtle'}`}
              style={{ fontSize: '0.62rem', padding: '0.15rem 0.45rem' }}
            >
              {item.badge}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile / Tablet Backdrop Overlay */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div
          style={{
            padding: '1.25rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--glow-cyan)',
                fontWeight: 800,
                fontSize: '1.15rem',
                color: '#031726',
              }}
            >
              KM
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                KANAB MOTORS
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: 600, letterSpacing: '0.04em' }}>
                SIMS ENTERPRISE V2.0
              </div>
            </div>
          </div>

          {/* Close button on mobile / tablet */}
          <button
            type="button"
            onClick={onClose}
            className="sidebar-close-btn"
            title="Close menu"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Active System Status Badge */}
        <div style={{ padding: '0.85rem 1.25rem 0.25rem' }}>
          <div
            className="system-status-badge"
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--accent-emerald)',
                boxShadow: '0 0 8px var(--accent-emerald)',
              }}
            />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                ENTERPRISE SIMS v2.0
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                Automotive Logistics & Finance
              </div>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
          {renderNavSection('Import & Landed Cost', procurementItems)}
          {renderNavSection('Financial Engine', financialItems)}
          {renderNavSection('Core Masters', masterItems)}
          {renderNavSection('Compliance & Logs', systemItems)}
        </nav>

        {/* Pipeline Preview Footer */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
              ENTERPRISE SECURITY
            </span>
            <span className="badge badge-emerald" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
              ● Verified
            </span>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
            Continuous ledger audit trail & real-time inventory synchronization.
          </p>
        </div>
      </aside>
    </>
  );
};
