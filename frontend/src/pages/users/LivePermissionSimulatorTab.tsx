import React, { useState } from 'react';
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
} from 'lucide-react';
import { api, AppUser, Role, SystemModule, SystemAction } from '../../api/client';

interface Props {
  users: AppUser[];
  roles: Role[];
}

export const LivePermissionSimulatorTab: React.FC<Props> = ({ users, roles }) => {
  const [selectedUserId, setSelectedUserId] = useState<number>(users[0]?.userId || 1);
  const [selectedModule, setSelectedModule] = useState<string>('INVENTORY');
  const [selectedAction, setSelectedAction] = useState<string>('CREATE');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [result, setResult] = useState<{
    evaluated: boolean;
    granted: boolean;
    reason: string;
    details: any;
  } | null>(null);

  const modulesList = [
    { code: 'CUSTOMER', name: 'Customer CRM' },
    { code: 'PRODUCT', name: 'Product Master Data' },
    { code: 'ENQUIRY', name: 'Sales Enquiry & Quotes' },
    { code: 'BOOKING', name: 'Advance Bookings' },
    { code: 'PAYMENT', name: 'Payment Receipts (BRV)' },
    { code: 'LEDGER', name: 'Customer Ledger & SOA' },
    { code: 'EXCESS_PAYMENT', name: 'Excess Payment Routing' },
    { code: 'REFUND', name: 'Customer Refunds' },
    { code: 'IMPORT', name: 'International Logistics' },
    { code: 'INVENTORY', name: 'Inventory & Warehousing' },
    { code: 'ALLOTMENT', name: 'Vehicle Allotment' },
    { code: 'INVOICE', name: 'Sales Invoices' },
    { code: 'DELIVERY', name: 'Delivery & Handover' },
    { code: 'APPROVAL_WORKFLOW', name: 'Approval Workflow Engine' },
    { code: 'DOCUMENT', name: 'Document Management' },
    { code: 'DASHBOARD', name: 'Management Dashboards' },
    { code: 'AUDIT', name: 'Audit & Compliance' },
    { code: 'USER_ROLE_MGMT', name: 'User & Role Management' },
  ];

  const actionsList = [
    { code: 'VIEW', name: 'View' },
    { code: 'CREATE', name: 'Create' },
    { code: 'EDIT', name: 'Edit' },
    { code: 'APPROVE', name: 'Approve' },
    { code: 'CANCEL', name: 'Cancel' },
    { code: 'REFUND', name: 'Refund' },
    { code: 'ADJUST_BALANCE', name: 'Adjust Balance' },
    { code: 'EXPORT_REPORT', name: 'Export Report' },
    { code: 'MANAGE_USERS', name: 'Manage Users' },
  ];

  const targetUser = users.find((u) => u.userId === selectedUserId) || users[0];
  const targetRole = roles.find((r) => r.roleId === targetUser?.roleId || r.roleName === targetUser?.role?.roleName);

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
        reason = 'Denied: Account is currently suspended / deactivated.';
      } else if (
        targetUser.role?.roleName === 'ADMIN' ||
        targetRole?.roleName === 'ADMIN' ||
        targetRole?.displayName === 'System Administrator'
      ) {
        reason = 'Granted: System Administrator master kernel bypass.';
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

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Simulation Controls Form */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 210, 211, 0.12)',
              color: 'var(--accent-cyan)',
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Live SQL RBAC Evaluator
            </h3>
            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Executes PostgreSQL <code style={{ color: 'var(--accent-cyan)' }}>fn_user_has_permission()</code> in real time
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* User Select */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              1. Select Subject User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="form-control"
              style={{ fontSize: '0.85rem' }}
            >
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName} (@{u.username}) — {u.role?.displayName || u.role?.roleName || 'User'}
                  {!u.isActive ? ' [SUSPENDED]' : ''}
                </option>
              ))}
            </select>
            {targetUser && (
              <div
                style={{
                  marginTop: '0.4rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  gap: '0.75rem',
                }}
              >
                <span>
                  Role: <strong style={{ color: 'var(--accent-cyan)' }}>{targetRole?.displayName || targetRole?.roleName}</strong>
                </span>
                <span>
                  Status:{' '}
                  <strong style={{ color: targetUser.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                    {targetUser.isActive ? 'Active' : 'Suspended'}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Module Select */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              2. Target Functional Module (18 Modules)
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.85rem' }}
            >
              {modulesList.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Select */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: '0.35rem',
              }}
            >
              3. Target System Action (9 Actions)
            </label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.85rem' }}
            >
              {actionsList.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} ({a.name})
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="btn btn-primary"
            style={{
              padding: '0.65rem 1.25rem',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.5rem',
            }}
          >
            <Play size={16} />
            <span>{evaluating ? 'Evaluating in PostgreSQL...' : 'Evaluate Permission Engine'}</span>
          </button>
        </div>
      </div>

      {/* Simulation Result Card */}
      <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--border-color)', minHeight: '360px' }}>
        <h4 style={{ margin: '0 0 1rem', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Database Evaluation Verdict
        </h4>

        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Big Verdict Banner */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                background: result.granted
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.05))'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05))',
                border: result.granted ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1.5px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {result.granted ? (
                <CheckCircle2 size={36} style={{ color: '#10b981', flexShrink: 0 }} />
              ) : (
                <XCircle size={36} style={{ color: '#ef4444', flexShrink: 0 }} />
              )}
              <div>
                <div
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: result.granted ? '#10b981' : '#ef4444',
                    letterSpacing: '0.02em',
                  }}
                >
                  {result.granted ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  {result.reason}
                </div>
              </div>
            </div>

            {/* Query & Trigger Diagnostics */}
            <div
              style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                // PostgreSQL Invocation:
              </div>
              <div style={{ color: 'var(--accent-cyan)' }}>
                SELECT fn_user_has_permission({result.details?.user ? targetUser.userId : '?'}, '{selectedModule}', '{selectedAction}');
              </div>
              <div style={{ marginTop: '0.5rem', color: result.granted ? '#10b981' : '#ef4444' }}>
                -- Returns: {result.granted ? 'TRUE' : 'FALSE'}
              </div>
            </div>

            {/* Retrofit Write Path Hardening Check */}
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Write Path Impact Analysis:
              </div>
              {selectedModule === 'INVENTORY' && selectedAction === 'CREATE' ? (
                <span>
                  Triggers <code style={{ color: 'var(--accent-cyan)' }}>trg_check_stock_adjustment_create</code> on <code>stock_adjustment</code> table. {result.granted ? 'User CAN request stock adjustments.' : 'Trigger will RAISE EXCEPTION on insert.'}
                </span>
              ) : selectedModule === 'INVOICE' && selectedAction === 'CREATE' ? (
                <span>
                  Triggers <code style={{ color: 'var(--accent-cyan)' }}>trg_check_sales_invoice_create</code> on <code>sales_invoice</code> table. {result.granted ? 'User CAN create commercial sales invoices.' : 'Trigger will RAISE EXCEPTION on insert.'}
                </span>
              ) : selectedModule === 'APPROVAL_WORKFLOW' && selectedAction === 'APPROVE' ? (
                <span>
                  Enforced by <code style={{ color: 'var(--accent-cyan)' }}>fn_record_approval_decision</code>. {result.granted ? 'User CAN record approval decisions.' : 'Function will RAISE EXCEPTION.'}
                </span>
              ) : selectedModule === 'CUSTOMER' && selectedAction === 'VIEW' ? (
                <span>
                  Enforced via PostgreSQL Row-Level Security policy <code style={{ color: 'var(--accent-cyan)' }}>customer_rbac_select_policy</code>. {result.granted ? 'Customer rows visible.' : 'Customer rows filtered out.'}
                </span>
              ) : (
                <span>
                  Standard RBAC check: Callable in write paths and API services across the system.
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
              height: '240px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <HelpCircle size={36} style={{ strokeWidth: 1.5, marginBottom: '0.75rem', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              Select a corporate user, functional module, and action on the left, then click{' '}
              <strong>"Evaluate Permission Engine"</strong> to run a live database check.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
