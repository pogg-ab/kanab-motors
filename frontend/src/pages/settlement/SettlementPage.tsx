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
  Building,
  Check,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  api,
  CustomerRefund,
  Customer,
  CustomerBankAccount,
  Booking,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

export const REFUND_REASONS = [
  { code: 'EXCESS_PAYMENT', label: 'Excess Payment (customer paid more than required amount)' },
  { code: 'BOOKING_CANCELLATION', label: 'Booking Cancellation (booking cancelled and advance refundable)' },
  { code: 'VEHICLE_MODEL_CHANGE', label: 'Vehicle Model Change (existing payment returned or adjusted)' },
  { code: 'INVENTORY_UNAVAILABLE', label: 'Inventory Unavailable (vehicle cannot be supplied)' },
  { code: 'CUSTOMER_CANCELLATION', label: 'Customer Cancellation (customer requested cancellation)' },
  { code: 'OTHER_APPROVED_REASON', label: 'Other Approved Reason (specify below)' },
];

export const maskAccountNumber = (accNum?: string) => {
  if (!accNum) return 'N/A';
  if (accNum.length <= 4) return '••••' + accNum;
  return '••••••••' + accNum.slice(-4);
};

export const getApprovalTier = (amount: number) => {
  if (amount <= 10000) {
    return {
      tier: 'Tier 1',
      role: 'Finance Officer',
      badgeClass: 'badge-cyan',
      color: 'var(--accent-cyan)',
      bg: 'rgba(6, 182, 212, 0.12)',
      border: 'rgba(6, 182, 212, 0.3)',
      desc: '≤ ETB 10,000 — Finance Officer',
    };
  } else if (amount <= 50000) {
    return {
      tier: 'Tier 2',
      role: 'Finance Manager',
      badgeClass: 'badge-amber',
      color: 'var(--accent-amber)',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      desc: 'ETB 10,001 to 50,000 — Finance Manager',
    };
  } else {
    return {
      tier: 'Tier 3',
      role: 'Senior Management',
      badgeClass: 'badge-rose',
      color: 'var(--accent-rose)',
      bg: 'rgba(244, 63, 94, 0.12)',
      border: 'rgba(244, 63, 94, 0.3)',
      desc: '> ETB 50,000 — Senior Management / Executive',
    };
  }
};

export const SettlementPage: React.FC = () => {
  const { can } = usePermissions();
  const canCreateRefund = can('REFUNDS_CREATE');
  const canReviewRefund = can('REFUNDS_REVIEW');
  const canApproveRefund = can('REFUNDS_APPROVE');
  const canProcessRefund = can('REFUNDS_PROCESS');
  const canRejectRefund = can('REFUNDS_REJECT');
  const canRouteExcess = can('EXCESS_ROUTE');
  const [activeTab, setActiveTab] = useState<'refunds' | 'excess'>('refunds');
  const [refunds, setRefunds] = useState<CustomerRefund[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals
  const [showNewRefundModal, setShowNewRefundModal] = useState<boolean>(false);
  const [showExcessRouteModal, setShowExcessRouteModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [rejectingRefund, setRejectingRefund] = useState<CustomerRefund | null>(null);
  const [payoutRefund, setPayoutRefund] = useState<CustomerRefund | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // In-modal error states
  const [refundError, setRefundError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Refund Form State (Section 11 standard)
  const [newRefund, setNewRefund] = useState<{
    customerId: string;
    bookingId?: string;
    originalPaymentReference?: string;
    refundAmount: number;
    refundReasonCode: string;
    refundReasonCustom: string;
    refundMethod: string;
    bankAccountId: string;
  }>({
    customerId: '',
    bookingId: '',
    originalPaymentReference: '',
    refundAmount: 0,
    refundReasonCode: 'EXCESS_PAYMENT',
    refundReasonCustom: '',
    refundMethod: 'BANK_TRANSFER',
    bankAccountId: '',
  });

  // Finance Payout Confirmation State (Section 11 Step 4)
  const [payoutData, setPayoutData] = useState<{
    paymentReference: string;
    payoutDate: string;
    actualAmountPaid: number;
    paymentMethod: string;
    notes: string;
  }>({
    paymentReference: '',
    payoutDate: new Date().toISOString().split('T')[0],
    actualAmountPaid: 0,
    paymentMethod: 'BANK_TRANSFER',
    notes: '',
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
      const [refRes, custRes, bookRes] = await Promise.all([
        api.getRefunds(),
        api.getCustomers(),
        api.getBookings(),
      ]);
      setRefunds(refRes.items || []);
      setCustomers(custRes.items || []);
      setBookings(bookRes.items || []);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load settlement data'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateRefund) return;
    setRefundError(null);
    if (!newRefund.customerId || newRefund.refundAmount <= 0) {
      setRefundError('Customer and positive refund amount are required');
      return;
    }
    const reasonObj = REFUND_REASONS.find((r) => r.code === newRefund.refundReasonCode);
    let finalReason = reasonObj ? reasonObj.label : newRefund.refundReasonCode;
    if (newRefund.refundReasonCode === 'OTHER_APPROVED_REASON') {
      if (!newRefund.refundReasonCustom.trim()) {
        setRefundError('Please specify the detailed explanation for Other Approved Reason.');
        return;
      }
      finalReason = `Other: ${newRefund.refundReasonCustom.trim()}`;
    }

    setSaving(true);
    try {
      const created = await api.createRefund({
        customerId: newRefund.customerId,
        bookingId: newRefund.bookingId || undefined,
        originalPaymentReference: newRefund.originalPaymentReference?.trim() || undefined,
        refundAmount: newRefund.refundAmount,
        refundReason: finalReason,
        refundMethod: newRefund.refundMethod,
        bankAccountId: newRefund.bankAccountId || undefined,
      });
      showToast('success', `Refund request ${created.refundNumber} submitted! Subject to available balance validation.`);
      setShowNewRefundModal(false);
      setRefundError(null);
      setNewRefund({
        customerId: '',
        bookingId: '',
        originalPaymentReference: '',
        refundAmount: 0,
        refundReasonCode: 'EXCESS_PAYMENT',
        refundReasonCustom: '',
        refundMethod: 'BANK_TRANSFER',
        bankAccountId: '',
      });
      loadData();
    } catch (err: any) {
      setRefundError(formatApiError(err, 'Refund submission failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceWorkflow = async (id: string, stage: 'review' | 'approve' | 'process') => {
    if ((stage === 'review' && !canReviewRefund) || (stage === 'approve' && !canApproveRefund) || (stage === 'process' && !canProcessRefund)) return;
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
      }
      loadData();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Workflow action failed'));
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProcessRefund || !payoutRefund) return;
    setPayoutError(null);
    if (!payoutData.paymentReference.trim()) {
      setPayoutError('Bank Reference / Transaction ID is mandatory for payout audit trail.');
      return;
    }
    setSaving(true);
    try {
      await api.confirmRefundPayout(payoutRefund.refundId, {
        paymentReference: payoutData.paymentReference.trim(),
        paymentMethod: payoutData.paymentMethod,
        actualAmountPaid: payoutData.actualAmountPaid,
        notes: payoutData.notes.trim() || undefined,
      });
      showToast('success', `Refund payout for ${payoutRefund.refundNumber} successfully confirmed! Ledger settled.`);
      setShowPayoutModal(false);
      setPayoutRefund(null);
      setPayoutError(null);
      loadData();
    } catch (err: any) {
      setPayoutError(formatApiError(err, 'Payout confirmation failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRejectRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRejectRefund) return;
    setRejectError(null);
    if (!rejectingRefund || !rejectionReason.trim()) {
      setRejectError('Mandatory rejection explanation is required');
      return;
    }
    setSaving(true);
    try {
      await api.rejectRefund(rejectingRefund.refundId, rejectionReason.trim());
      showToast('success', `Refund request ${rejectingRefund.refundNumber} rejected. Balance remains intact.`);
      setShowRejectModal(false);
      setRejectingRefund(null);
      setRejectionReason('');
      setRejectError(null);
      loadData();
    } catch (err: any) {
      setRejectError(formatApiError(err, 'Refund rejection failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleRouteExcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRouteExcess) return;
    setRouteError(null);
    if (!selectedCustomer) return;
    const available = Number(selectedCustomer.accountSummary?.excessPayments || 0);
    if (excessAmount <= 0) {
      setRouteError('Please enter a valid amount greater than 0.');
      return;
    }
    if (excessAmount > available) {
      setRouteError(`Amount cannot exceed available unallocated excess of ETB ${available.toLocaleString()}.`);
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
      setRouteError(null);
      loadData();
    } catch (err: any) {
      setRouteError(formatApiError(err, 'Excess routing failed'));
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
            {canCreateRefund && (
              <button
                onClick={() => {
                  setRefundError(null);
                  setShowNewRefundModal(true);
                }}
                className="btn btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} />
                Request Refund
              </button>
            )}
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

      {/* Dashboard KPI Summary Cards (Client Specification: Section 11 Dashboard) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Requests
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
            {refunds.filter((r) => r.status === 'REQUESTED' || r.status === 'REVIEWED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Under review</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Approved
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
            {refunds.filter((r) => r.status === 'APPROVED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Manager approved</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-indigo)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Processing
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.25rem' }}>
            {refunds.filter((r) => r.status === 'FINANCE_PROCESSED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Finance audit cleared</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Completed (Settled)
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
            {refunds.filter((r) => r.status === 'CONFIRMED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Debited & confirmed</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rejected
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
            {refunds.filter((r) => r.status === 'REJECTED').length}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Balance intact</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Disbursed
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
            ETB {totalRefunded.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Settled payouts</div>
        </div>

        <div className="card" style={{ padding: '1rem 1.15rem', borderLeft: '4px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pending Pipeline
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', marginTop: '0.35rem' }}>
            ETB {totalPendingRefunds.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Active in-flight</div>
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
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REFUND REF</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOOKING</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>REASON & METHOD</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AMOUNT (ETB)</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUDIT PIPELINE</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading Refunds...
                    </td>
                  </tr>
                ) : filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                          {r.bankAccount && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }} title={`Account Holder: ${r.bankAccount.accountHolderName}`}>
                              <Building size={12} />
                              <span>{r.bankAccount.bankName} • {maskAccountNumber(r.bankAccount.accountNumber)}</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {r.booking ? (
                            <div>
                              <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                                {r.booking.bookingNumber}
                              </span>
                              {r.originalPaymentReference && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                  Ref: {r.originalPaymentReference}
                                </div>
                              )}
                            </div>
                          ) : r.originalPaymentReference ? (
                            <span className="mono-code" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Ref: {r.originalPaymentReference}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
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
                          {(() => {
                            const tier = getApprovalTier(Number(r.refundAmount || 0));
                            return (
                              <div style={{ marginTop: '0.25rem' }}>
                                <span
                                  className={`badge ${tier.badgeClass}`}
                                  style={{ fontSize: '0.62rem', letterSpacing: '0.02em', padding: '0.15rem 0.45rem' }}
                                  title={tier.desc}
                                >
                                  {tier.role}
                                </span>
                              </div>
                            );
                          })()}
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
                            {r.status === 'REQUESTED' && canReviewRefund && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'review')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                {actioningId === r.refundId ? 'Reviewing...' : 'Review'}
                              </button>
                            )}

                            {r.status === 'REVIEWED' && canApproveRefund && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'approve')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-cyan)', borderColor: 'rgba(6, 182, 212, 0.4)' }}
                              >
                                {actioningId === r.refundId ? 'Approving...' : 'Manager Approve'}
                              </button>
                            )}

                            {r.status === 'APPROVED' && canProcessRefund && (
                              <button
                                onClick={() => handleAdvanceWorkflow(r.refundId, 'process')}
                                disabled={actioningId === r.refundId}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                              >
                                {actioningId === r.refundId ? 'Auditing...' : 'Finance Audit'}
                              </button>
                            )}

                            {r.status === 'FINANCE_PROCESSED' && canProcessRefund && (
                              <button
                                onClick={() => {
                                  setPayoutError(null);
                                  setPayoutRefund(r);
                                  setPayoutData({
                                    paymentReference: '',
                                    payoutDate: new Date().toISOString().split('T')[0],
                                    actualAmountPaid: Number(r.refundAmount || 0),
                                    paymentMethod: r.refundMethod || 'BANK_TRANSFER',
                                    notes: '',
                                  });
                                  setShowPayoutModal(true);
                                }}
                                disabled={actioningId === r.refundId}
                                className="btn btn-cyan"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
                              >
                                Confirm Payout
                              </button>
                            )}

                            {r.status !== 'CONFIRMED' && r.status !== 'REJECTED' && canRejectRefund && (
                              <button
                                onClick={() => {
                                  setRejectError(null);
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
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
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
                        {canRouteExcess && (
                        <button
                          onClick={() => {
                            setRouteError(null);
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Refund Request (Section 11) */}
      {showNewRefundModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.55rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Initiate Customer Refund Request</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Strictly validated against customer available refundable balance (Section 11)</span>
                </div>
              </div>
              <button onClick={() => setShowNewRefundModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateRefund}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <ModalErrorAlert error={refundError} onDismiss={() => setRefundError(null)} />
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
                          onChange={(e) => {
                            const cid = e.target.value;
                            const targetCust = customers.find((c) => c.customerId === cid);
                            const primaryBa = targetCust?.bankAccounts?.find((b) => b.isPrimary) || targetCust?.bankAccounts?.[0];
                            setNewRefund({
                              ...newRefund,
                              customerId: cid,
                              bankAccountId: primaryBa ? primaryBa.bankAccountId : '',
                            });
                          }}
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

                      {/* Optional Related Booking Order & Original Payment (Client Spec) */}
                      {selCust && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Related Booking (Optional)
                            </label>
                            <select
                              className="input"
                              value={newRefund.bookingId || ''}
                              onChange={(e) => setNewRefund({ ...newRefund, bookingId: e.target.value })}
                            >
                              <option value="">None / General Balance</option>
                              {bookings
                                .filter((b) => b.customerId === selCust.customerId)
                                .map((b) => (
                                  <option key={b.bookingId} value={b.bookingId}>
                                    {b.bookingNumber} — {b.item?.itemName || 'Vehicle'} (Dep: ETB {Number(b.totalAmountDeposited || 0).toLocaleString()})
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Original Deposit / BRV Ref
                            </label>
                            <input
                              type="text"
                              className="input"
                              placeholder="e.g. BRV-202610-001 or CBE-98124"
                              value={newRefund.originalPaymentReference || ''}
                              onChange={(e) => setNewRefund({ ...newRefund, originalPaymentReference: e.target.value })}
                            />
                          </div>
                        </div>
                      )}

                      {/* Customer Bank Account (Masked) */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            Target Customer Bank Account
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Masked for security</span>
                        </div>
                        {selCust && selCust.bankAccounts && selCust.bankAccounts.length > 0 ? (
                          <select
                            className="input"
                            value={newRefund.bankAccountId}
                            onChange={(e) => setNewRefund({ ...newRefund, bankAccountId: e.target.value })}
                          >
                            <option value="">Select Registered Account...</option>
                            {selCust.bankAccounts.map((ba) => (
                              <option key={ba.bankAccountId} value={ba.bankAccountId}>
                                {ba.bankName} — {maskAccountNumber(ba.accountNumber)} ({ba.accountHolderName}){ba.isPrimary ? ' ★ Primary' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              color: 'var(--accent-amber)',
                              fontSize: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                            }}
                          >
                            <AlertTriangle size={14} />
                            <span>{selCust ? 'No registered bank account found on profile. Wire payout will require manual details.' : 'Select a customer to view registered bank accounts.'}</span>
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
                            <span>Refund amount exceeds customer's available refundable balance of ETB {availRefundable.toLocaleString()}</span>
                          </div>
                        )}
                        {newRefund.refundAmount > 0 && (() => {
                          const tier = getApprovalTier(newRefund.refundAmount);
                          return (
                            <div
                              style={{
                                marginTop: '0.4rem',
                                padding: '0.45rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                background: tier.bg,
                                border: `1px solid ${tier.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.75rem',
                              }}
                            >
                              <span style={{ color: 'var(--text-secondary)' }}>Required Approval Tier:</span>
                              <strong style={{ color: tier.color, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <ShieldAlert size={13} />
                                {tier.tier}: {tier.role} ({tier.desc})
                              </strong>
                            </div>
                          );
                        })()}
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

                      {/* Standardized Refund Reason (Master Category) */}
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Refund Reason (Section 11 Master Category) *
                        </label>
                        <select
                          className="input"
                          value={newRefund.refundReasonCode}
                          onChange={(e) => setNewRefund({ ...newRefund, refundReasonCode: e.target.value })}
                          required
                        >
                          {REFUND_REASONS.map((reason) => (
                            <option key={reason.code} value={reason.code}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {newRefund.refundReasonCode === 'OTHER_APPROVED_REASON' && (
                        <div>
                          <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Specific Justification & Details *
                          </label>
                          <textarea
                            className="input"
                            rows={2}
                            value={newRefund.refundReasonCustom}
                            onChange={(e) => setNewRefund({ ...newRefund, refundReasonCustom: e.target.value })}
                            placeholder="Enter detailed reason, management exception approval, or audit justification..."
                            required
                          />
                        </div>
                      )}
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

      {/* Modal: Confirm Finance Payout (Section 11 Step 4) */}
      {showPayoutModal && payoutRefund && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.55rem',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Coins size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Confirm Finance Payout
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Step 4: Final Disbursement, Bank Reference & Ledger Settlement
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPayoutModal(false);
                  setPayoutRefund(null);
                  setPayoutError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmPayout}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <ModalErrorAlert error={payoutError} onDismiss={() => setPayoutError(null)} />

                {/* Summary Card */}
                <div
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-color)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Refund Request</div>
                    <strong className="mono-code" style={{ color: 'var(--accent-rose)' }}>{payoutRefund.refundNumber}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Customer</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{payoutRefund.customer?.fullName}</strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Approved Amount</div>
                    <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                      ETB {Number(payoutRefund.refundAmount).toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Destination Account</div>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {payoutRefund.bankAccount
                        ? `${payoutRefund.bankAccount.bankName} • ${maskAccountNumber(payoutRefund.bankAccount.accountNumber)}`
                        : `${payoutRefund.refundMethod} (Direct)`}
                    </span>
                  </div>
                </div>

                {/* Form Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Bank Ref / Transaction ID *
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={payoutData.paymentReference}
                      onChange={(e) => setPayoutData({ ...payoutData, paymentReference: e.target.value })}
                      placeholder="e.g. FT2409823482 or CPO-1928"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Disbursement Date *
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={payoutData.payoutDate}
                      onChange={(e) => setPayoutData({ ...payoutData, payoutDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Actual Amount Disbursed (ETB) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={payoutData.actualAmountPaid}
                      onChange={(e) => setPayoutData({ ...payoutData, actualAmountPaid: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Payment Method *
                    </label>
                    <select
                      className="input"
                      value={payoutData.paymentMethod}
                      onChange={(e) => setPayoutData({ ...payoutData, paymentMethod: e.target.value })}
                      required
                    >
                      <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                      <option value="CPO">Cashier Payment Order (CPO)</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="CASH">Cash Payout</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Finance Audit Notes / Comments (Optional)
                  </label>
                  <textarea
                    className="input"
                    rows={2}
                    value={payoutData.notes}
                    onChange={(e) => setPayoutData({ ...payoutData, notes: e.target.value })}
                    placeholder="e.g. Paid via CBE Internet Banking portal, confirmation advice archived..."
                  />
                </div>

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Info size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <span>
                    Confirming payout transitions status to <strong>CONFIRMED</strong>, creates an immutable Customer Ledger DEBIT transaction, and deducts the refundable balance.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayoutModal(false);
                    setPayoutRefund(null);
                    setPayoutError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving || !payoutData.paymentReference.trim()} className="btn btn-cyan">
                  {saving ? 'Posting to Ledger...' : 'Confirm & Post Payout'}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.55rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                    Reject Refund Request
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Request: {rejectingRefund.refundNumber} (ETB {Number(rejectingRefund.refundAmount).toLocaleString()})
                  </span>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectRefund}>
              <div className="modal-body">
                <ModalErrorAlert error={rejectError} onDismiss={() => setRejectError(null)} />
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
                <ModalErrorAlert error={routeError} onDismiss={() => setRouteError(null)} />
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
