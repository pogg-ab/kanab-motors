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
  Truck,
  FolderOpen,
  CheckCircle2,
  Boxes,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TAB_PERMISSIONS, canAccessAny } from '../authz/permissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { hasPermission } = useAuth();
  const navRef = React.useRef<HTMLElement>(null);
  const executiveItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      module: 'Analytics',
      icon: LayoutDashboard,
      badge: 'Live',
      permissions: TAB_PERMISSIONS.dashboard,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics Hub',
      module: 'BI Engine',
      icon: BarChart3,
      badge: 'KMS-7',
      permissions: TAB_PERMISSIONS.reports,
    },
  ];

  const procurementItems = [
    {
      id: 'shipments',
      label: 'Shipments & Landed Cost',
      module: 'Logistics',
      icon: Ship,
      badge: 'Engine',
      permissions: TAB_PERMISSIONS.shipments,
    },
    {
      id: 'purchase-orders',
      label: 'Purchase Orders',
      module: 'Procurement',
      icon: ClipboardList,
      badge: 'Orders',
      permissions: TAB_PERMISSIONS['purchase-orders'],
    },
    {
      id: 'suppliers',
      label: 'Suppliers Master',
      module: 'Vendor',
      icon: Building2,
      badge: 'Global',
      permissions: TAB_PERMISSIONS.suppliers,
    },
    {
      id: 'procurement-reports',
      label: 'Import Pipeline & Reports',
      module: 'Analytics',
      icon: BarChart3,
      badge: 'BI',
      permissions: TAB_PERMISSIONS['procurement-reports'],
    },
  ];

  const masterItems = [
    {
      id: 'customers',
      label: 'Customers & Dealers',
      module: 'Directory',
      icon: Users,
      badge: 'Core',
      permissions: TAB_PERMISSIONS.customers,
    },
    {
      id: 'products',
      label: 'Product Master Data',
      module: 'Inventory',
      icon: Package,
      badge: 'Catalog',
      permissions: TAB_PERMISSIONS.products,
    },
    {
      id: 'vehicles',
      label: 'Vehicle Units & Chassis',
      module: 'Registry',
      icon: CarFront,
      badge: 'Tracking',
      permissions: TAB_PERMISSIONS.vehicles,
    },
  ];

  const financialItems = [
    {
      id: 'statement',
      label: 'Customer Ledger & SOA',
      module: 'Ledger',
      icon: FileSpreadsheet,
      badge: 'Ledger',
      permissions: TAB_PERMISSIONS.statement,
    },
    {
      id: 'enquiries',
      label: 'Sales Enquiries & Quotes',
      module: 'Pipeline',
      icon: FileText,
      badge: 'CRM',
      permissions: TAB_PERMISSIONS.enquiries,
    },
    {
      id: 'bookings',
      label: 'Advance Bookings',
      module: 'Orders',
      icon: Bookmark,
      badge: 'Queue',
      permissions: TAB_PERMISSIONS.bookings,
    },
    {
      id: 'allotments',
      label: 'Vehicle Allotments',
      module: 'Allotment',
      icon: CarFront,
      badge: 'VIN',
      permissions: TAB_PERMISSIONS.allotments,
    },
    {
      id: 'payments',
      label: 'BRV Receipts & Deposits',
      module: 'Finance',
      icon: Receipt,
      badge: 'Inflow',
      permissions: TAB_PERMISSIONS.payments,
    },
    {
      id: 'settlement',
      label: 'Excess & Refund Payouts',
      module: 'Refunds',
      icon: Coins,
      badge: 'Audit',
      permissions: TAB_PERMISSIONS.settlement,
    },
  ];

  const operationsItems = [
    {
      id: 'inventory',
      label: 'Inventory & Warehouses',
      module: 'Warehouse',
      icon: Boxes,
      badge: 'KMS-4',
      permissions: TAB_PERMISSIONS.inventory,
    },
    {
      id: 'invoices',
      label: 'Sales Invoices & VAT',
      module: 'Settlement',
      icon: Receipt,
      badge: 'IV1–13',
      permissions: TAB_PERMISSIONS.invoices,
    },
    {
      id: 'deliveries',
      label: 'Deliveries & Handover',
      module: 'Handover',
      icon: Truck,
      badge: 'DL1–10',
      permissions: TAB_PERMISSIONS.deliveries,
    },
    {
      id: 'approvals',
      label: 'Approval Queue & Policies',
      module: 'Engine',
      icon: CheckCircle2,
      badge: 'AW1–10',
      permissions: TAB_PERMISSIONS.approvals,
    },
    {
      id: 'documents',
      label: 'Unified Document Center',
      module: 'Documents',
      icon: FolderOpen,
      badge: 'DA1–6',
      permissions: TAB_PERMISSIONS.documents,
    },
  ];

  const systemItems = [
    {
      id: 'users',
      label: 'Users & Permissions',
      module: 'RBAC',
      icon: UserCog,
      badge: 'Access',
      permissions: TAB_PERMISSIONS.users,
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      module: 'System',
      icon: ShieldCheck,
      badge: 'Audit',
      permissions: TAB_PERMISSIONS.audit,
    },
  ];

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (onClose) {
      onClose();
    }
  };

  type NavItem = (typeof masterItems)[number];
  const renderNavSection = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter((item) => canAccessAny(hasPermission, item.permissions));
    if (visibleItems.length === 0) return null;

    return (
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
      {visibleItems.map((item) => {
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
  };

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

      <aside
        className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`}
        onWheel={(e) => {
          if (navRef.current && !navRef.current.contains(e.target as Node)) {
            navRef.current.scrollTop += e.deltaY;
          }
        }}
      >
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
        <nav ref={navRef} className="sidebar-nav">
          {renderNavSection('Executive Intelligence', executiveItems)}
          {renderNavSection('Operations & Approvals', operationsItems)}
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
