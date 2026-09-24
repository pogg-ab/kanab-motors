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
  X,
  Info,
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
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectingRefund, setRejectingRefund] = useState<CustomerRefund | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
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
  const [excessNotes, setExcessNotes] = useState<string>('');

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
      showToast('error', err.response?.data?.message || err.message || 'Refund submission failed');
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
      showToast('error', err.response?.data?.message || err.message || 'Workflow action failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRefund || !rejectionReason.trim()) return;
    setSaving(true);
    try {
      await api.rejectRefund(rejectingRefund.refundId, rejectionReason.trim());
      showToast('success', `Refund request ${rejectingRefund.refundNumber} rejected. Balance remains intact.`);
      setShowRejectModal(false);
      setRejectingRefund(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Refund rejection failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRouteExcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const available = Number(selectedCustomer.accountSummary?.excessPayments || 0);
    if (excessAmount <= 0) {
      showToast('error', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (excessAmount > available) {
      showToast('error', `Amount cannot exceed available unallocated excess of ETB ${available.toLocaleString()}.`);
      return;
    }

    const targetRoute = excessAction === 'TRANSFER_TO_CREDIT' ? 'CUSTOMER_CREDIT' : 'REFUNDABLE';
    setSaving(true);
    try {
      await api.routeExcess(selectedCustomer.customerId, {
        routeTo: targetRoute,
        action: targetRoute,
        amount: excessAmount,
        notes: excessNotes.trim() || `Manual allocation to ${targetRoute === 'CUSTOMER_CREDIT' ? 'Customer Credit' : 'Refundable Balance'}`,
      });
      showToast('success', `ETB ${excessAmount.toLocaleString()} successfully routed to ${targetRoute === 'CUSTOMER_CREDIT' ? 'Store Credit' : 'Refundable Balance'}!`);
      setShowExcessRouteModal(false);
      setSelectedCustomer(null);
      setExcessNotes('');
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
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
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

                            {r.status !== 'CONFIRMED' && r.status !== 'REJECTED' && (
                              <button
                                onClick={() => {
                                  setRejectingRefund(r);
                                  setRejectionReason('');
                                  setShowRejectModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.35)' }}
                              >
                                Reject
                              </button>
                            )}

                            {r.status === 'CONFIRMED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                                <CheckCircle2 size={14} /> Settled & Debited
                              </span>
                            )}

                            {r.status === 'REJECTED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                                <ShieldAlert size={14} /> Rejected
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
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UNALLOCATED EXCESS</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STORE CREDIT</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFUNDABLE BALANCE</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const excess = Number(c.accountSummary?.excessPayments || 0);
                  const credit = Number(c.accountSummary?.availableCredit || 0);
                  const refundable = Number(c.accountSummary?.refundableBalance || 0);

                  return (
                    <tr key={c.customerId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>{c.customerCode}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.fullName}</div>
                        <span className="badge badge-indigo" style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>{c.customerType}</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: excess > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                          ETB {excess.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: credit > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                          ETB {credit.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: refundable > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                          ETB {refundable.toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setExcessAmount(excess > 0 ? excess : 0);
                            setExcessNotes('');
                            setExcessAction('TRANSFER_TO_REFUNDABLE');
                            setShowExcessRouteModal(true);
                          }}
                          className={`btn ${excess > 0 ? 'btn-cyan' : 'btn-secondary'}`}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                        >
                          Route Deposit Funds
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Refund Request */}
      {showNewRefundModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.55rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Initiate Customer Refund Request</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Strictly validated against customer refundable balance per SRS §7.4</span>
                </div>
              </div>
              <button onClick={() => setShowNewRefundModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRefund}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                {(() => {
                  const selCust = customers.find((c) => c.customerId === newRefund.customerId);
                  const availRefundable = Number(selCust?.accountSummary?.refundableBalance || 0);
                  const isOverLimit = newRefund.refundAmount > availRefundable;

                  return (
                    <>
                      <div>
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
                        {selCust && (
                          <div style={{ marginTop: '0.4rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Available Refundable Balance:</span>
                            <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                              ETB {availRefundable.toLocaleString()}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            Refund Amount (ETB) *
                          </label>
                          {selCust && availRefundable > 0 && (
                            <button
                              type="button"
                              onClick={() => setNewRefund({ ...newRefund, refundAmount: availRefundable })}
                              className="btn btn-secondary"
                              style={{ padding: '0.15rem 0.5rem', fontSize: '0.7rem', height: 'auto', color: 'var(--accent-cyan)' }}
                            >
                              Max Available (ETB {availRefundable.toLocaleString()})
                            </button>
                          )}
                        </div>
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
                        {selCust && isOverLimit && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                            <AlertTriangle size={14} />
                            <span>Refund amount exceeds customer's available refundable balance of ETB {availRefundable.toLocaleString()} (SRS §7.4 Violation)</span>
                          </div>
                        )}
                      </div>

                      <div>
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

                      <div>
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
                    </>
                  );
                })()}
              </div>

              <div className="modal-footer">
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

      {/* Modal: Reject Refund */}
      {showRejectModal && rejectingRefund && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                  Reject Refund Request
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Request: {rejectingRefund.refundNumber} (ETB {Number(rejectingRefund.refundAmount).toLocaleString()})
                </span>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectRefund}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mandatory Rejection Explanation *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide specific reason (e.g. Invalid claim documentation, duplicate refund submitted)..."
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ℹ️ Rejecting this request transitions its status to <strong>REJECTED</strong>. The customer's refundable balance remains intact without any deduction.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !rejectionReason.trim()} className="btn btn-rose">
                  {saving ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excess Routing */}
      {showExcessRouteModal && selectedCustomer && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowRightLeft size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                    Route Excess / Unallocated Funds
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Customer: <strong style={{ color: 'var(--text-primary)' }}>{selectedCustomer.fullName}</strong>
                    </span>
                    <span
                      className="mono-code"
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: 'rgba(6, 182, 212, 0.12)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(6, 182, 212, 0.25)',
                      }}
                    >
                      {selectedCustomer.customerCode}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExcessRouteModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.65rem', borderRadius: '8px' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRouteExcess}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {(() => {
                  const availableExcess = Number(selectedCustomer.accountSummary?.excessPayments || 0);
                  const currentCredit = Number(selectedCustomer.accountSummary?.availableCredit || 0);
                  const currentRefundable = Number(selectedCustomer.accountSummary?.refundableBalance || 0);
                  const isValidAmount = excessAmount > 0 && excessAmount <= availableExcess;
                  const remainingExcess = Math.max(0, availableExcess - (isValidAmount ? excessAmount : 0));
                  const projectedNewTarget =
                    (excessAction === 'TRANSFER_TO_CREDIT' ? currentCredit : currentRefundable) +
                    (isValidAmount ? excessAmount : 0);

                  return (
                    <>
                      {/* Customer Balance Breakdown */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block' }}>
                          Current Account Balances
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                          <div
                            style={{
                              padding: '0.75rem 0.9rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Available Excess
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                              ETB {availableExcess.toLocaleString()}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '0.75rem 0.9rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Store Credit
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                              ETB {currentCredit.toLocaleString()}
                            </div>
                          </div>

                          <div
                            style={{
                              padding: '0.75rem 0.9rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Refundable
                            </div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                              ETB {currentRefundable.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Destination Selection Cards */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
                          Destination Sub-Account *
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          {/* Option 1: Refundable */}
                          <div
                            onClick={() => setExcessAction('TRANSFER_TO_REFUNDABLE')}
                            style={{
                              padding: '0.9rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              border: excessAction === 'TRANSFER_TO_REFUNDABLE' ? '2px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                              background: excessAction === 'TRANSFER_TO_REFUNDABLE' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ color: 'var(--accent-emerald)', display: 'flex' }}>
                                    <DollarSign size={18} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Refundable Balance</span>
                                </div>
                                {excessAction === 'TRANSFER_TO_REFUNDABLE' && (
                                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Selected</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                Unlocks funds for wire or cash payout disbursement back to customer through executive refund audit pipeline.
                              </div>
                            </div>
                          </div>

                          {/* Option 2: Store Credit */}
                          <div
                            onClick={() => setExcessAction('TRANSFER_TO_CREDIT')}
                            style={{
                              padding: '0.9rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              cursor: 'pointer',
                              border: excessAction === 'TRANSFER_TO_CREDIT' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                              background: excessAction === 'TRANSFER_TO_CREDIT' ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div style={{ color: 'var(--accent-cyan)', display: 'flex' }}>
                                    <Coins size={18} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Store Credit Balance</span>
                                </div>
                                {excessAction === 'TRANSFER_TO_CREDIT' && (
                                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>Selected</span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                                Retains funds on customer ledger. Instantly deductible towards current or future vehicle booking orders.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Transfer Amount with Presets */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                          <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            Transfer Amount (ETB) *
                          </label>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            {[0.25, 0.5, 0.75, 1].map((pct) => {
                              const targetVal = Math.round(availableExcess * pct * 100) / 100;
                              const label = pct === 1 ? '100% (Max)' : `${pct * 100}%`;
                              const isActive = excessAmount === targetVal && targetVal > 0;
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  disabled={availableExcess <= 0}
                                  onClick={() => setExcessAmount(targetVal)}
                                  className="btn btn-secondary"
                                  style={{
                                    padding: '0.2rem 0.55rem',
                                    fontSize: '0.7rem',
                                    height: 'auto',
                                    background: isActive ? 'rgba(6, 182, 212, 0.15)' : undefined,
                                    borderColor: isActive ? 'var(--accent-cyan)' : undefined,
                                    color: isActive ? 'var(--accent-cyan)' : undefined,
                                  }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                          <span
                            style={{
                              position: 'absolute',
                              left: '0.85rem',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: 'var(--text-muted)',
                              fontFamily: 'monospace',
                            }}
                          >
                            ETB
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={availableExcess > 0 ? availableExcess : undefined}
                            className="input"
                            style={{ paddingLeft: '3.4rem', fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 700 }}
                            value={excessAmount || ''}
                            onChange={(e) => setExcessAmount(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        {/* Validation notice */}
                        {excessAmount > availableExcess && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}>
                            <AlertTriangle size={14} />
                            <span>Amount exceeds available unallocated excess of ETB {availableExcess.toLocaleString()}</span>
                          </div>
                        )}
                        {availableExcess === 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-amber)' }}>
                            <Info size={14} />
                            <span>Customer currently has no unallocated excess balance to route.</span>
                          </div>
                        )}
                      </div>

                      {/* Audit Note */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'block' }}>
                          Internal Audit Justification & Notes (Optional)
                        </label>
                        <input
                          type="text"
                          className="input"
                          value={excessNotes}
                          onChange={(e) => setExcessNotes(e.target.value)}
                          placeholder="e.g. Allocation requested by finance for upcoming vehicle booking deposit..."
                        />
                      </div>

                      {/* Live Allocation Impact Simulation */}
                      <div
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px dashed var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.78rem',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Remaining Excess:</span>
                          <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            ETB {remainingExcess.toLocaleString()}
                          </strong>
                        </div>
                        <div style={{ color: 'var(--border-color)' }}>|</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            Projected {excessAction === 'TRANSFER_TO_CREDIT' ? 'Store Credit' : 'Refundable'}:
                          </span>
                          <strong
                            style={{
                              color: excessAction === 'TRANSFER_TO_CREDIT' ? 'var(--accent-cyan)' : 'var(--accent-emerald)',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                            }}
                          >
                            ETB {projectedNewTarget.toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowExcessRouteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    Number(selectedCustomer.accountSummary?.excessPayments || 0) <= 0 ||
                    excessAmount <= 0 ||
                    excessAmount > Number(selectedCustomer.accountSummary?.excessPayments || 0)
                  }
                  className="btn btn-cyan"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                >
                  <ArrowRightLeft size={16} />
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
