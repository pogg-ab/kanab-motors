import React, { useState, useEffect } from 'react';
import {
  Coins,
  ArrowRightLeft,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Clock,
  Plus,
  ArrowDownRight,
} from 'lucide-react';
import {
  api,
  CustomerRefund,
  Customer,
} from '../../api/client';

export const SettlementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'refunds' | 'excess'>('refunds');
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showNewRefundModal, setShowNewRefundModal] = useState<boolean>(false);
  const [showExcessRouteModal, setShowExcessRouteModal] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Refund Form State
  const [newRefund, setNewRefund] = useState<{
    customerId: string;
    refundAmount: number;
    refundReason: string;
    refundMethod: string;
  }>({
    customerId: '',
    refundAmount: 0,
    refundReason: '',
    refundMethod: 'BANK_TRANSFER',
  });

  // Excess Routing State
  const [excessAction, setExcessAction] = useState<'TRANSFER_TO_CREDIT' | 'TRANSFER_TO_REFUNDABLE'>('TRANSFER_TO_REFUNDABLE');
  const [excessAmount, setExcessAmount] = useState<number>(0);

  const [saving, setSaving] = useState<boolean>(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [refRes, custRes] = await Promise.all([
        api.getRefunds(),
        api.getCustomers(),
      ]);
      setRefunds(refRes.items || []);
      setCustomers(custRes.items || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRefund.customerId || newRefund.refundAmount <= 0) {
      showToast('error', 'Customer and positive refund amount are required');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createRefund(newRefund);
      showToast('success', `Refund request ${created.refundNumber} submitted! Subject to available balance validation.`);
      setShowNewRefundModal(false);
      setNewRefund({
        customerId: '',
        refundAmount: 0,
        refundReason: '',
        refundMethod: 'BANK_TRANSFER',
      });
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Refund submission failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceWorkflow = async (id: string, stage: 'review' | 'approve' | 'process' | 'payout') => {
    setActioningId(id);
    try {
      if (stage === 'review') {
        await api.reviewRefund(id);
        showToast('success', 'Refund marked as Reviewed by Sales/Operations.');
      } else if (stage === 'approve') {
        await api.approveRefund(id);
        showToast('success', 'Refund approved by Manager. Routed to Finance.');
      } else if (stage === 'process') {
        await api.processRefund(id);
        showToast('success', 'Finance Audit passed. Processed for disbursement.');
      } else if (stage === 'payout') {
        await api.confirmRefundPayout(id);
        showToast('success', 'Refund payout confirmed! Ledger debited and balance settled.');
      }
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Workflow action failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleRouteExcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || excessAmount <= 0) return;
    setSaving(true);
    try {
      await api.routeExcess(selectedCustomer.customerId, {
        action: excessAction,
        amount: excessAmount,
        notes: `Manual allocation to ${excessAction === 'TRANSFER_TO_CREDIT' ? 'Customer Credit' : 'Refundable Balance'}`,
      });
      showToast('success', `ETB ${excessAmount.toLocaleString()} routed successfully!`);
      setShowExcessRouteModal(false);
      setSelectedCustomer(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Excess routing failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredRefunds = refunds.filter((r) => {
    const matchesSearch =
      r.refundNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      r.refundReason?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const totalRefunded = refunds
    .filter((r) => r.status === 'CONFIRMED')
    .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  const totalPendingRefunds = refunds
    .filter((r) => r.status !== 'CONFIRMED' && r.status !== 'REJECTED')
    .reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Financial Engine</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Invoicing & Settlement</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Excess Funds & Refunds</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Coins size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Excess Funds, Credit Routing & Refunds
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Refundable balance verification & 4-stage executive audit payout pipeline
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <button onClick={() => setShowNewRefundModal(true)} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} />
              Request Refund
            </button>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{notification.msg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Disbursed Refunds</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ETB {totalRefunded.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Fully settled and customer ledger debited
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>In-Flight Refund Pipeline</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ETB {totalPendingRefunds.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Pending branch review or Finance disbursement audit
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-indigo)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compliance Protocol</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Audit Enforced
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Automated over-refund balance protection active
          </div>
        </div>
      </div>

      {/* Tabs / Filter Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`filter-pill ${activeTab === 'refunds' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Coins size={15} />
          <span>Customer Refund Requests ({refunds.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('excess')}
          className={`filter-pill ${activeTab === 'excess' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <ArrowRightLeft size={15} />
          <span>Excess Deposits & Credit Routing</span>
        </button>
      </div>

      {/* TAB 1: REFUNDS */}
      {activeTab === 'refunds' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '360px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search refund #, customer, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%', height: '38px', fontSize: '0.85rem' }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {filteredRefunds.length} record{filteredRefunds.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFUND REF</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REASON & METHOD</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT (ETB)</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUDIT PIPELINE</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading Refunds...
                    </td>
                  </tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No refund records found.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((r) => {
                    const custName = r.customer?.fullName || 'Customer';
                    return (
                      <tr key={r.refundId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)', background: 'rgba(244, 63, 94, 0.08)' }}>
                            {r.refundNumber}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{custName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Code: <span className="mono-code" style={{ fontSize: '0.65rem' }}>{r.customer?.customerCode}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{r.refundMethod}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {r.refundReason}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-rose)', fontFamily: 'monospace' }}>
                            ETB {Number(r.refundAmount).toLocaleString()}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              r.status === 'CONFIRMED'
                                ? 'badge-emerald'
                                : r.status === 'FINANCE_PROCESSED'
                                ? 'badge-indigo'
                                : r.status === 'APPROVED'
                                ? 'badge-cyan'
                                : r.status === 'REJECTED'
                                ? 'badge-rose'
                                : 'badge-amber'
                            }`}
                          >
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            {r.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'review')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                {actioningId === r.refundId ? 'Reviewing...' : 'Review'}
                              </button>
                            )}

                            {r.status === 'REVIEWED' && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'approve')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                              >
                                {actioningId === r.refundId ? 'Approving...' : 'Manager Approve'}
                              </button>
                            )}

                            {r.status === 'APPROVED' && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'process')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                              >
                                {actioningId === r.refundId ? 'Auditing...' : 'Finance Audit'}
                              </button>
                            )}

                            {r.status === 'FINANCE_PROCESSED' && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'payout')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-cyan"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                {actioningId === r.refundId ? 'Paying...' : 'Confirm Payout'}
                              </button>
                            )}

                            {r.status === 'CONFIRMED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                                <CheckCircle2 size={14} /> Settled & Debited
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EXCESS DEPOSITS */}
      {activeTab === 'excess' && (
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Customer Overpayment & Excess Routing</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              Instant re-routing of unallocated deposits between Customer Credit and Refundable Balance.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER CODE</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NAME / COMPANY</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TYPE</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.customerId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>{c.customerCode}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {c.fullName}
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="badge badge-indigo">{c.customerType}</span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setSelectedCustomer(c);
                          setExcessAmount(50000);
                          setShowExcessRouteModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                      >
                        Route Deposit Funds
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Refund Request */}
      {showNewRefundModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Initiate Customer Refund Request</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Validated against available refundable balance</span>
              </div>
              <button onClick={() => setShowNewRefundModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateRefund}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer *</label>
                <select
                  className="input"
                  value={newRefund.customerId}
                  onChange={(e) => setNewRefund({ ...newRefund, customerId: e.target.value })}
                  required
                >
                  <option value="">Select Customer...</option>
                  {customers.map((c) => (
                    <option key={c.customerId} value={c.customerId}>
                      {c.fullName} ({c.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Refund Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input"
                  value={newRefund.refundAmount || ''}
                  onChange={(e) => setNewRefund({ ...newRefund, refundAmount: parseFloat(e.target.value) || 0 })}
                  placeholder="Amount to disburse"
                  required
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Validation: Amount must not exceed customer's available refundable balance.
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Disbursement Method *</label>
                <select
                  className="input"
                  value={newRefund.refundMethod}
                  onChange={(e) => setNewRefund({ ...newRefund, refundMethod: e.target.value })}
                  required
                >
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="CPO">Cashier Payment Order (CPO)</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Cash Payout</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Refund Reason & Justification *</label>
                <textarea
                  className="input"
                  rows={2}
                  value={newRefund.refundReason}
                  onChange={(e) => setNewRefund({ ...newRefund, refundReason: e.target.value })}
                  placeholder="Order cancelled, excess wire deposit, bank loan rejected..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowNewRefundModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Validating...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excess Routing */}
      {showExcessRouteModal && selectedCustomer && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Route Excess / Unallocated Funds
                </h2>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                  Customer: <strong>{selectedCustomer.fullName}</strong>
                </div>
              </div>
              <button onClick={() => setShowExcessRouteModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleRouteExcess}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Destination Sub-account *</label>
                <select
                  className="input"
                  value={excessAction}
                  onChange={(e) => setExcessAction(e.target.value as any)}
                >
                  <option value="TRANSFER_TO_REFUNDABLE">Customer Refundable Balance (For Payout)</option>
                  <option value="TRANSFER_TO_CREDIT">Customer Credit Balance (For Future Orders)</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  className="input"
                  value={excessAmount}
                  onChange={(e) => setExcessAmount(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowExcessRouteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Processing...' : 'Confirm Routing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
