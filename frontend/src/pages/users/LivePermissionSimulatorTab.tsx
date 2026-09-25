import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Play,
  User,
  Layers,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  PlusCircle,
  Edit3,
  Ban,
  RotateCcw,
  Sliders,
  Download,
  Search,
  ChevronDown,
  Check,
  FileText,
  CreditCard,
  Truck,
  Warehouse,
  Calendar,
  BarChart3,
  Package,
  Sparkles,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { api, AppUser, Role } from '../../api/client';

interface Props {
  users: AppUser[];
  roles: Role[];
}

interface ModuleItem {
  code: string;
  name: string;
  category: 'CRM & Sales' | 'Finance & Ledger' | 'Logistics & Stock' | 'Governance & Analytics';
  icon: any;
  desc: string;
}

interface ActionItem {
  code: string;
  name: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  desc: string;
}

export const LivePermissionSimulatorTab: React.FC<Props> = ({ users, roles }) => {
  const [selectedUserId, setSelectedUserId] = useState<number>(users[0]?.userId || 1);
  const [selectedModule, setSelectedModule] = useState<string>('INVENTORY');
  const [selectedAction, setSelectedAction] = useState<string>('CREATE');
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<string>('ALL');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<{
    evaluated: boolean;
    granted: boolean;
    reason: string;
    details: any;
  } | null>(null);

  // 18 Enterprise Functional Modules with Categories and Icons
  const modulesList: ModuleItem[] = [
    // CRM & Sales
    { code: 'CUSTOMER', name: 'Customer CRM', category: 'CRM & Sales', icon: User, desc: 'Corporate profiles, KYC & accounts' },
    { code: 'PRODUCT', name: 'Product Catalog', category: 'CRM & Sales', icon: Package, desc: 'Vehicle master catalog & specs' },
    { code: 'ENQUIRY', name: 'Enquiries & Quotes', category: 'CRM & Sales', icon: HelpCircle, desc: 'Customer inquiries & quotations' },
    { code: 'BOOKING', name: 'Advance Bookings', category: 'CRM & Sales', icon: Calendar, desc: 'Vehicle reservations & orders' },
    { code: 'ALLOTMENT', name: 'Vehicle Allotment', category: 'CRM & Sales', icon: Layers, desc: 'Physical VIN reservations & locks' },

    // Finance & Ledger
    { code: 'PAYMENT', name: 'Payment Receipts', category: 'Finance & Ledger', icon: CreditCard, desc: 'Bank receipt vouchers (BRV)' },
    { code: 'LEDGER', name: 'Customer Ledger', category: 'Finance & Ledger', icon: FileText, desc: 'Financial engine & SOA' },
    { code: 'EXCESS_PAYMENT', name: 'Excess Routing', category: 'Finance & Ledger', icon: Sliders, desc: 'Overpayment reallocation' },
    { code: 'REFUND', name: 'Customer Refunds', category: 'Finance & Ledger', icon: RotateCcw, desc: 'Multi-tier deposit disbursements' },
    { code: 'INVOICE', name: 'Sales Invoices', category: 'Finance & Ledger', icon: FileText, desc: 'Commercial invoices & VAT' },

    // Logistics & Stock
    { code: 'IMPORT', name: 'Logistics & POs', category: 'Logistics & Stock', icon: Truck, desc: '6-stage international shipments' },
    { code: 'INVENTORY', name: 'Inventory & Stock', category: 'Logistics & Stock', icon: Warehouse, desc: 'Physical vehicle yard & adjustments' },
    { code: 'DELIVERY', name: 'Vehicle Delivery', category: 'Logistics & Stock', icon: Truck, desc: 'Gate passes & PDI handover' },
    { code: 'DOCUMENT', name: 'Documents Vault', category: 'Logistics & Stock', icon: FileText, desc: 'Trade licenses & import papers' },

    // Governance & Analytics
    { code: 'APPROVAL_WORKFLOW', name: 'Approval Engine', category: 'Governance & Analytics', icon: ShieldCheck, desc: 'Multi-tier managerial approvals' },
    { code: 'DASHBOARD', name: 'Management KPIs', category: 'Governance & Analytics', icon: BarChart3, desc: 'Executive metric dashboards' },
    { code: 'AUDIT', name: 'Audit Logs', category: 'Governance & Analytics', icon: ShieldAlert, desc: 'Immutable SHA-256 event trails' },
    { code: 'USER_ROLE_MGMT', name: 'User & Role RBAC', category: 'Governance & Analytics', icon: User, desc: 'IAM & 162-cell permission matrix' },
  ];

  // 9 Canonical System Actions with Vibrant Accents & Icons
  const actionsList: ActionItem[] = [
    { code: 'VIEW', name: 'View', icon: Eye, color: '#38bdf8', bgColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.35)', desc: 'Inspect records' },
    { code: 'CREATE', name: 'Create', icon: PlusCircle, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.35)', desc: 'Initiate new entries' },
    { code: 'EDIT', name: 'Edit', icon: Edit3, color: '#818cf8', bgColor: 'rgba(129, 140, 248, 0.12)', borderColor: 'rgba(129, 140, 248, 0.35)', desc: 'Modify existing data' },
    { code: 'APPROVE', name: 'Approve', icon: CheckCircle2, color: '#a855f7', bgColor: 'rgba(168, 85, 247, 0.12)', borderColor: 'rgba(168, 85, 247, 0.35)', desc: 'Managerial sign-off' },
    { code: 'CANCEL', name: 'Cancel', icon: Ban, color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.12)', borderColor: 'rgba(249, 115, 22, 0.35)', desc: 'Void & revoke' },
    { code: 'REFUND', name: 'Refund', icon: RotateCcw, color: '#eab308', bgColor: 'rgba(234, 179, 8, 0.12)', borderColor: 'rgba(234, 179, 8, 0.35)', desc: 'Disburse funds' },
    { code: 'ADJUST_BALANCE', name: 'Adjust', icon: Sliders, color: '#14b8a6', bgColor: 'rgba(20, 184, 166, 0.12)', borderColor: 'rgba(20, 184, 166, 0.35)', desc: 'Ledger/Stock balance' },
    { code: 'EXPORT_REPORT', name: 'Export', icon: Download, color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.12)', borderColor: 'rgba(6, 182, 212, 0.35)', desc: 'Download CSV / PDF' },
    { code: 'MANAGE_USERS', name: 'Admin', icon: ShieldAlert, color: '#f43f5e', bgColor: 'rgba(244, 63, 94, 0.12)', borderColor: 'rgba(244, 63, 94, 0.35)', desc: 'Administer RBAC' },
  ];

  const targetUser = users.find((u) => u.userId === selectedUserId) || users[0];
  const targetRole = roles.find((r) => r.roleId === targetUser?.roleId || r.roleName === targetUser?.role?.roleName);

  // Filter users in dropdown search
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase())),
    );
  }, [users, userSearchTerm]);

  // Filter modules by category
  const filteredModules = useMemo(() => {
    if (moduleCategoryFilter === 'ALL') return modulesList;
    return modulesList.filter((m) => m.category === moduleCategoryFilter);
  }, [moduleCategoryFilter]);

  const selectedModuleObj = modulesList.find((m) => m.code === selectedModule) || modulesList[0];
  const selectedActionObj = actionsList.find((a) => a.code === selectedAction) || actionsList[0];

  const handleRunEvaluation = async () => {
    if (!targetUser) return;
    setEvaluating(true);
    setResult(null);

    try {
      const res = await api.checkPermission({
        userId: targetUser.userId,
        moduleCode: selectedModule,
        actionCode: selectedAction,
      });

      let reason = '';
      if (!targetUser.isActive) {
        reason = 'Denied: Account is currently suspended / deactivated in app_user.';
      } else if (
        targetUser.role?.roleName === 'ADMIN' ||
        targetRole?.roleName === 'ADMIN' ||
        targetRole?.displayName === 'System Administrator'
      ) {
        reason = 'Granted: System Administrator master kernel bypass in fn_user_has_permission.';
      } else if (res.granted) {
        reason = `Granted: Authorized via role matrix or explicit user privilege for ${selectedModule}:${selectedAction}.`;
      } else {
        reason = `Denied: Role "${targetRole?.displayName || targetRole?.roleName || 'User'}" does not possess ${selectedAction} rights on ${selectedModule}.`;
      }

      setResult({
        evaluated: true,
        granted: res.granted,
        reason,
        details: {
          user: targetUser.username,
          fullName: targetUser.fullName,
          role: targetRole?.displayName || targetRole?.roleName,
          isActive: targetUser.isActive,
          module: selectedModule,
          action: selectedAction,
        },
      });
    } catch (err: any) {
      setResult({
        evaluated: true,
        granted: false,
        reason: err.response?.data?.message || 'Permission check query failed.',
        details: null,
      });
    } finally {
      setEvaluating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.25fr) minmax(340px, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
      {/* Simulation Controls Form */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.2), rgba(108, 92, 231, 0.2))',
                border: '1px solid rgba(0, 210, 211, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Live SQL RBAC Evaluator
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Directly invokes PostgreSQL <code style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>fn_user_has_permission()</code>
              </p>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: 'var(--accent-cyan)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            KMSICAMS-9 Kernel
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
          {/* STEP 1: SUBJECT USER SELECTOR (Rich Custom Card with Quick Avatars) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <span>1. Select Subject User</span>
              </label>

              {/* Quick Preset Avatars */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {users.slice(0, 4).map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(u.userId);
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background:
                        selectedUserId === u.userId
                          ? 'linear-gradient(135deg, #00d2d3, #6c5ce7)'
                          : 'var(--bg-tertiary)',
                      border:
                        selectedUserId === u.userId
                          ? '2px solid #ffffff'
                          : '1px solid var(--border-color)',
                      color: selectedUserId === u.userId ? '#031726' : 'var(--text-muted)',
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    title={`${u.fullName} (@${u.username})`}
                  >
                    {getInitials(u.fullName)}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected User Hero Card / Dropdown Trigger */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: userDropdownOpen ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: userDropdownOpen ? '0 0 15px rgba(0, 210, 211, 0.15)' : 'none',
                }}
              >
                {targetUser ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                        color: '#031726',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(targetUser.fullName)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {targetUser.fullName}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          @{targetUser.username}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.1rem 0.45rem',
                            borderRadius: '4px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {targetRole?.displayName || targetRole?.roleName || 'User'}
                        </span>
                        {targetRole?.isSystemRole && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.62rem',
                              color: 'var(--accent-cyan)',
                            }}
                          >
                            <Lock size={10} /> System Role
                          </span>
                        )}
                        <span style={{ fontSize: '0.68rem', color: targetUser.isActive ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: targetUser.isActive ? '#10b981' : '#ef4444' }} />
                          {targetUser.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>Choose subject user...</span>
                )}

                <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', textDecoration: 'underline' }}>Change</span>
                  <ChevronDown size={16} style={{ transform: userDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
                </div>
              </div>

              {/* Searchable User Popover */}
              {userDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 20px 30px rgba(0,0,0,0.5)',
                    padding: '0.75rem',
                    maxHeight: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.6rem 0.4rem 2rem',
                        fontSize: '0.78rem',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {filteredUsers.map((u) => {
                      const uRole = roles.find((r) => r.roleId === u.roleId || r.roleName === u.role?.roleName);
                      const isSelected = u.userId === selectedUserId;
                      return (
                        <div
                          key={u.userId}
                          onClick={() => {
                            setSelectedUserId(u.userId);
                            setUserDropdownOpen(false);
                          }}
                          style={{
                            padding: '0.5rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            background: isSelected ? 'rgba(0, 210, 211, 0.12)' : 'transparent',
                            border: isSelected ? '1px solid rgba(0, 210, 211, 0.3)' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                                color: '#031726',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                              }}
                            >
                              {getInitials(u.fullName)}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                {u.fullName} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>@{u.username}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                {uRole?.displayName || uRole?.roleName || 'User'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={14} style={{ color: 'var(--accent-cyan)' }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: FUNCTIONAL MODULE (Category Chips & Interactive Grid) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.35rem' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                2. Target Functional Module (18 Modules)
              </label>

              {/* Category Pills */}
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {['ALL', 'CRM & Sales', 'Finance & Ledger', 'Logistics & Stock', 'Governance & Analytics'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setModuleCategoryFilter(cat)}
                    style={{
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      fontSize: '0.64rem',
                      fontWeight: 600,
                      background: moduleCategoryFilter === cat ? 'var(--accent-cyan)' : 'var(--bg-tertiary)',
                      color: moduleCategoryFilter === cat ? '#031726' : 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat === 'ALL' ? 'All (18)' : cat.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Module Tiles Grid (Scrollable) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '0.45rem',
                maxHeight: '190px',
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}
            >
              {filteredModules.map((m) => {
                const IconComponent = m.icon;
                const isSelected = m.code === selectedModule;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setSelectedModule(m.code)}
                    style={{
                      padding: '0.55rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(0, 210, 211, 0.15), rgba(108, 92, 231, 0.1))'
                        : 'var(--bg-secondary)',
                      border: isSelected
                        ? '1.5px solid var(--accent-cyan)'
                        : '1px solid var(--border-color)',
                      boxShadow: isSelected ? '0 0 10px rgba(0, 210, 211, 0.2)' : 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.45rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <IconComponent
                      size={15}
                      style={{
                        color: isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)',
                        flexShrink: 0,
                        marginTop: '0.1rem',
                      }}
                    />
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                        }}
                      >
                        {m.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.62rem',
                          fontFamily: 'monospace',
                          color: isSelected ? 'var(--text-secondary)' : 'var(--text-muted)',
                          marginTop: '0.1rem',
                        }}
                      >
                        {m.code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 3: SYSTEM ACTION (9 Action Pills with Vibrant Icons) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                3. Target System Action (9 Actions)
              </label>

              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Action: <strong style={{ color: selectedActionObj.color }}>{selectedActionObj.name}</strong>
              </span>
            </div>

            {/* 9 Action Chips */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.45rem' }}>
              {actionsList.map((a) => {
                const IconComp = a.icon;
                const isSelected = a.code === selectedAction;
                return (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => setSelectedAction(a.code)}
                    style={{
                      padding: '0.55rem 0.65rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? a.bgColor : 'var(--bg-secondary)',
                      border: isSelected ? `1.5px solid ${a.color}` : '1px solid var(--border-color)',
                      boxShadow: isSelected ? `0 0 12px ${a.borderColor}` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left',
                    }}
                  >
                    <IconComp size={15} style={{ color: isSelected ? a.color : 'var(--text-muted)' }} />
                    <div>
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: isSelected ? a.color : 'var(--text-primary)',
                        }}
                      >
                        {a.name}
                      </div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        {a.code}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={evaluating}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #00d2d3, #6c5ce7)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.88rem',
              fontWeight: 800,
              cursor: evaluating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              boxShadow: '0 10px 25px rgba(0, 210, 211, 0.3)',
              transition: 'all 0.2s ease',
              marginTop: '0.25rem',
            }}
          >
            {evaluating ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                <span>Evaluating in PostgreSQL Kernel...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Run Real-time RBAC Evaluation</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* RIGHT SIDE: VERDICT & WRITE-PATH SECURITY DIAGNOSTICS */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          border: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          minHeight: '480px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Database Verdict Diagnostics
          </h4>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Live Response
          </span>
        </div>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
            {/* Big Glow Verdict Banner */}
            <div
              style={{
                padding: '1.4rem',
                borderRadius: 'var(--radius-lg)',
                background: result.granted
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.08))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.08))',
                border: result.granted ? '1.5px solid rgba(16, 185, 129, 0.5)' : '1.5px solid rgba(239, 68, 68, 0.5)',
                boxShadow: result.granted
                  ? '0 0 25px rgba(16, 185, 129, 0.2)'
                  : '0 0 25px rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: result.granted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {result.granted ? (
                  <CheckCircle2 size={36} style={{ color: '#10b981' }} />
                ) : (
                  <XCircle size={36} style={{ color: '#ef4444' }} />
                )}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 900,
                    color: result.granted ? '#10b981' : '#ef4444',
                    letterSpacing: '0.02em',
                  }}
                >
                  {result.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                  {result.reason}
                </div>
              </div>
            </div>

            {/* Target Tuple Summary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.74rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Subject</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {targetUser.fullName}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Module</div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.15rem' }}>
                  {selectedModuleObj.name}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Action</div>
                <div style={{ fontWeight: 700, color: selectedActionObj.color, marginTop: '0.15rem' }}>
                  {selectedActionObj.name}
                </div>
              </div>
            </div>

            {/* Interactive PostgreSQL Console Diagnostics */}
            <div
              style={{
                background: '#030712',
                borderRadius: 'var(--radius-md)',
                padding: '1.1rem',
                border: '1px solid var(--border-color)',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ color: '#9ca3af', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.7rem' }}>
                -- PostgreSQL 16 Kernel Invocation:
              </div>
              <div style={{ color: '#38bdf8', lineHeight: 1.5 }}>
                SELECT fn_user_has_permission(
                <br />
                &nbsp;&nbsp;p_user_id := <span style={{ color: '#f59e0b' }}>{targetUser.userId}</span>,{' '}
                <span style={{ color: '#6b7280' }}>/* @{targetUser.username} */</span>
                <br />
                &nbsp;&nbsp;p_module_code := <span style={{ color: '#10b981' }}>'{selectedModule}'</span>,
                <br />
                &nbsp;&nbsp;p_action_code := <span style={{ color: '#a855f7' }}>'{selectedAction}'</span>
                <br />
                );
              </div>
              <div style={{ marginTop: '0.65rem', paddingTop: '0.5rem', borderTop: '1px solid #1f2937', color: result.granted ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                ==&gt; {result.granted ? 'TRUE (1 row affected)' : 'FALSE (0 rows affected)'}
              </div>
            </div>

            {/* Security Interceptor & Write Path Impact Analysis */}
            <div
              style={{
                padding: '0.95rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent-cyan)' }} />
                <span>Write Path Hardening Interceptor:</span>
              </div>
              {selectedModule === 'INVENTORY' && selectedAction === 'CREATE' ? (
                <span>
                  Protected by PostgreSQL trigger <code style={{ color: 'var(--accent-cyan)' }}>trg_check_stock_adjustment_create</code> on <code>stock_adjustment</code> table.{' '}
                  {result.granted
                    ? 'Insertion will succeed; stock adjustment recorded.'
                    : 'PostgreSQL engine will abort transaction and RAISE EXCEPTION on INSERT.'}
                </span>
              ) : selectedModule === 'INVOICE' && selectedAction === 'CREATE' ? (
                <span>
                  Protected by PostgreSQL trigger <code style={{ color: 'var(--accent-cyan)' }}>trg_check_sales_invoice_create</code> on <code>sales_invoice</code> table.{' '}
                  {result.granted
                    ? 'Commercial sales invoice creation permitted.'
                    : 'PostgreSQL engine will abort transaction and RAISE EXCEPTION on INSERT.'}
                </span>
              ) : selectedModule === 'APPROVAL_WORKFLOW' && selectedAction === 'APPROVE' ? (
                <span>
                  Enforced by kernel function <code style={{ color: 'var(--accent-cyan)' }}>fn_record_approval_decision</code>.{' '}
                  {result.granted
                    ? 'User has signing authority to advance approval request.'
                    : 'Decision rejected: user lacks APPROVAL_WORKFLOW:APPROVE privilege.'}
                </span>
              ) : selectedModule === 'CUSTOMER' && selectedAction === 'VIEW' ? (
                <span>
                  Enforced at PostgreSQL storage level via Row-Level Security (RLS) policy <code style={{ color: 'var(--accent-cyan)' }}>customer_rbac_select_policy</code>.{' '}
                  {result.granted
                    ? 'Customer records are returned by SELECT queries.'
                    : 'Rows are filtered out natively at the DB engine layer.'}
                </span>
              ) : (
                <span>
                  Standard enterprise RBAC check: Evaluated by NestJS guards and service write paths before database mutation.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              textAlign: 'center',
              color: 'var(--text-muted)',
              padding: '2rem 1rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--accent-cyan)',
              }}
            >
              <HelpCircle size={28} style={{ opacity: 0.6 }} />
            </div>
            <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Ready for Real-time Simulation
            </h5>
            <p style={{ margin: 0, fontSize: '0.8rem', maxWidth: '320px', lineHeight: 1.5 }}>
              Select a corporate user, target module, and system action on the left, then click{' '}
              <strong style={{ color: 'var(--accent-cyan)' }}>"Run Real-time RBAC Evaluation"</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
