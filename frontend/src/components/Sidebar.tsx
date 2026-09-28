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
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TAB_PERMISSIONS, canAccessAny } from '../authz/permissions';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  module: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
  permissions: string[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen = false, onClose }) => {
  const { hasPermission } = useAuth();
  const navRef = React.useRef<HTMLElement>(null);

  const executiveItems = [
    {
      id: 'dashboard',
      label: 'Executive Dashboard',
      module: 'Real-time Intelligence & KPIs',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'emerald',
      permissions: TAB_PERMISSIONS.dashboard,
    },
    {
      id: 'reports',
      label: 'Reports & Analytics Hub',
      module: 'Cross-Module BI Engine',
      icon: BarChart3,
      permissions: TAB_PERMISSIONS.reports,
    },
  ];

  const operationsItems = [
    {
      id: 'inventory',
      label: 'Inventory & Warehouses',
      module: 'Stock Balances & Tracking',
      icon: Boxes,
      permissions: TAB_PERMISSIONS.inventory,
    },
    {
      id: 'allotments',
      label: 'Vehicle Allotments',
      module: 'Physical VIN & Chassis Allocation',
      icon: CarFront,
      permissions: TAB_PERMISSIONS.allotments,
    },
    {
      id: 'invoices',
      label: 'Sales Invoices & VAT',
      module: '15% VAT & Booking Settlement',
      icon: Receipt,
      permissions: TAB_PERMISSIONS.invoices,
    },
    {
      id: 'deliveries',
      label: 'Deliveries & Handover',
      module: 'PDI Station & Gate Pass Dispatch',
      icon: Truck,
      permissions: TAB_PERMISSIONS.deliveries,
    },
    {
      id: 'approvals',
      label: 'Approval Queue & Policies',
      module: 'Internal Controls & Governance',
      icon: CheckCircle2,
      permissions: TAB_PERMISSIONS.approvals,
    },
    {
      id: 'documents',
      label: 'Unified Document Center',
      module: 'Cross-Entity Archive & Compliance',
      icon: FolderOpen,
      permissions: TAB_PERMISSIONS.documents,
    },
  ];

  const financialItems = [
    {
      id: 'statement',
      label: 'Customer Ledger & SOA',
      module: 'Live Audit Trail & Balances',
      icon: FileSpreadsheet,
      permissions: TAB_PERMISSIONS.statement,
    },
    {
      id: 'enquiries',
      label: 'Sales Enquiries & Quotes',
      module: 'Pre-Sales & Proforma Pipeline',
      icon: FileText,
      permissions: TAB_PERMISSIONS.enquiries,
    },
    {
      id: 'bookings',
      label: 'Advance Bookings',
      module: 'Customer Vehicle Reservations',
      icon: Bookmark,
      permissions: TAB_PERMISSIONS.bookings,
    },
    {
      id: 'payments',
      label: 'BRV Receipts & Deposits',
      module: 'Bank Deposit Verification',
      icon: Receipt,
      permissions: TAB_PERMISSIONS.payments,
    },
    {
      id: 'settlement',
      label: 'Excess & Refund Payouts',
      module: 'Settlement & Bank Disbursements',
      icon: Coins,
      permissions: TAB_PERMISSIONS.settlement,
    },
  ];

  const procurementItems = [
    {
      id: 'shipments',
      label: 'Shipments & Landed Cost',
      module: 'Maritime Logistics & Costing',
      icon: Ship,
      permissions: TAB_PERMISSIONS.shipments,
    },
    {
      id: 'purchase-orders',
      label: 'Purchase Orders',
      module: 'Supplier Orders & Verification',
      icon: ClipboardList,
      permissions: TAB_PERMISSIONS['purchase-orders'],
    },
    {
      id: 'suppliers',
      label: 'Suppliers Master',
      module: 'Global Manufacturers & Vendors',
      icon: Building2,
      permissions: TAB_PERMISSIONS.suppliers,
    },
    {
      id: 'procurement-reports',
      label: 'Import Pipeline & Reports',
      module: 'Cost Breakdown Analytics',
      icon: BarChart3,
      permissions: TAB_PERMISSIONS['procurement-reports'],
    },
  ];

  const masterItems = [
    {
      id: 'customers',
      label: 'Customers & Dealers',
      module: 'KYC Directory & Profiles',
      icon: Users,
      permissions: TAB_PERMISSIONS.customers,
    },
    {
      id: 'products',
      label: 'Product Master Data',
      module: 'Models, Trim & Technical Specs',
      icon: Package,
      permissions: TAB_PERMISSIONS.products,
    },
    {
      id: 'vehicles',
      label: 'Vehicle Units & Chassis',
      module: 'VIN & State Machine Registry',
      icon: CarFront,
      permissions: TAB_PERMISSIONS.vehicles,
    },
  ];

  const systemItems = [
    {
      id: 'users',
      label: 'Users & Permissions',
      module: 'Role-Based Access Control',
      icon: UserCog,
      permissions: TAB_PERMISSIONS.users,
    },
    {
      id: 'audit',
      label: 'Audit Trail Logs',
      module: 'Immutable System Activity Logs',
      icon: ShieldCheck,
      permissions: TAB_PERMISSIONS.audit,
    },
  ];

  const handleItemClick = (id: string) => {
    setActiveTab(id);
    if (onClose) {
      onClose();
    }
  };

  const renderNavSection = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter((item) => canAccessAny(hasPermission, item.permissions));
    if (visibleItems.length === 0) return null;

    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            fontSize: '0.66rem',
            textTransform: 'uppercase',
            fontWeight: 800,
            color: 'var(--text-muted)',
            padding: '0.35rem 0.85rem 0.45rem',
            letterSpacing: '0.08em',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{title}</span>
          <span style={{ height: '1px', flex: 1, marginLeft: '0.75rem', background: 'var(--border-color)', opacity: 0.6 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
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
                  padding: '0.6rem 0.85rem',
                  borderRadius: '10px',
                  background: isActive
                    ? 'var(--sidebar-active-bg, rgba(0, 210, 211, 0.12))'
                    : 'transparent',
                  border: isActive
                    ? '1px solid var(--sidebar-active-border, rgba(0, 210, 211, 0.3))'
                    : '1px solid transparent',
                  borderLeft: isActive
                    ? '3px solid var(--accent-cyan)'
                    : '3px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  textAlign: 'left',
                  boxShadow: isActive ? '0 2px 10px -2px rgba(0, 210, 211, 0.2)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isActive
                      ? 'rgba(0, 210, 211, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isActive
                      ? '1px solid rgba(0, 210, 211, 0.3)'
                      : '1px solid var(--border-color)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.84rem',
                      color: isActive ? 'var(--text-primary)' : 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: '0.67rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '0.05rem',
                    }}
                  >
                    {item.module}
                  </div>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.62rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '12px',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--accent-emerald)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    <span
                      style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: 'var(--accent-emerald)',
                        display: 'inline-block',
                      }}
                    />
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
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
            padding: '1.35rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-navbar)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 210, 211, 0.35)',
                fontWeight: 900,
                fontSize: '1.2rem',
                color: '#031726',
                letterSpacing: '-0.02em',
              }}
            >
              KM
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                }}
              >
                KANAB MOTORS
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--accent-cyan)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  marginTop: '0.15rem',
                  textTransform: 'uppercase',
                }}
              >
                Enterprise SIMS
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
        <div style={{ padding: '0.85rem 1rem 0.35rem' }}>
          <div
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent-emerald)',
                  boxShadow: '0 0 10px var(--accent-emerald)',
                }}
              />
              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  OPERATIONAL SYSTEM
                </div>
                <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                  Logistics & Automotive Finance
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'var(--accent-emerald)',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '0.15rem 0.45rem',
                borderRadius: '6px',
              }}
            >
              Active
            </span>
          </div>
        </div>

        {/* Nav Items */}
        <nav ref={navRef} className="sidebar-nav">
          {renderNavSection('Executive Intelligence', executiveItems)}
          {renderNavSection('Operations & Fulfillment', operationsItems)}
          {renderNavSection('Financial Settlement', financialItems)}
          {renderNavSection('Import Logistics', procurementItems)}
          {renderNavSection('Master Registries', masterItems)}
          {renderNavSection('Governance & Controls', systemItems)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield size={13} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
                ENTERPRISE ENGINE
              </span>
            </div>
            <span
              style={{
                fontSize: '0.62rem',
                padding: '0.12rem 0.45rem',
                borderRadius: '6px',
                fontWeight: 700,
                background: 'rgba(0, 210, 211, 0.12)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(0, 210, 211, 0.3)',
              }}
            >
              Verified
            </span>
          </div>
          <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.35, margin: 0 }}>
            Continuous ledger audit trail & real-time inventory synchronization.
          </p>
        </div>
      </aside>
    </>
  );
};
