import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Building2,
  DollarSign,
  Clock,
  Printer,
  ChevronRight,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import {
  api,
  CustomerPayment,
  Customer,
  Booking,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

export const PaymentsPage: React.FC = () => {
  const { can } = usePermissions();
  const canRecordPayment = can('PAYMENTS_RECORD');
  const canConfirmPayment = can('PAYMENTS_CONFIRM');
  const canRejectPayment = can('PAYMENTS_REJECT');
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedReceipt, setSelectedReceipt] = useState<CustomerPayment | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectingPayment, setRejectingPayment] = useState<CustomerPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('Cheque returned due to insufficient drawer funds');
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [customBankName, setCustomBankName] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);

  const ETHIOPIAN_BANKS = [
    'Commercial Bank of Ethiopia (CBE)',
    'Awash International Bank',
    'Dashen Bank',
    'Bank of Abyssinia',
    'Cooperative Bank of Oromia',
    'Hibret Bank (United Bank)',
    'Zemen Bank',
    'Nib International Bank',
    'Wegagen Bank',
    'Lion International Bank',
    'Oromia Bank',
    'Berhan Bank',
    'Bunna International Bank',
    'Enat Bank',
    'Abay Bank',
    'Addis International Bank',
    'Global Bank Ethiopia',
    'Sinqee Bank',
    'Tsedey Bank',
    'Amhara Bank',
    'Gadaa Bank',
    'Hijra Bank',
    'ZamZam Bank',
    'Ramis Bank',
    'Telebirr / CBE Birr',
    'OTHER',
  ];

  // Form state
  const [newPayment, setNewPayment] = useState<{
    customerId: string;
    bookingId: string;
    amount: number;
    instrumentType: 'CASH' | 'BANK_DEPOSIT' | 'TRANSFER' | 'CHEQUE';
    bankName: string;
    referenceNumber: string;
    referenceDate: string;
    isInstallment: boolean;
    notes?: string;
  }>({
    customerId: '',
    bookingId: '',
    amount: 0,
    instrumentType: 'TRANSFER',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    referenceNumber: '',
    referenceDate: new Date().toISOString().split('T')[0],
    isInstallment: false,
    notes: '',
  });

  // Story P14: CEO Installment Approval State
  const [showCeoModal, setShowCeoModal] = useState<boolean>(false);
  const [ceoPayment, setCeoPayment] = useState<CustomerPayment | null>(null);
  const [ceoReason, setCeoReason] = useState<string>('');
  const [decidingCeo, setDecidingCeo] = useState<boolean>(false);

  const [saving, setSaving] = useState<boolean>(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, custRes, bkgRes] = await Promise.all([
        api.getPayments(),
        api.getCustomers(),
        api.getBookings(),
      ]);
      setPayments(payRes.items || []);
      setCustomers(custRes.items || []);
      setBookings(bkgRes.items || []);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load payments data'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRecordPayment) return;
    setCreateError(null);
    if (!newPayment.customerId || !newPayment.amount || Number(newPayment.amount) <= 0) {
      setCreateError('Customer and positive deposit amount are required');
      return;
    }

    const resolvedBank =
      newPayment.bankName === 'OTHER' ? customBankName.trim() : (newPayment.bankName || customBankName.trim());
    if (!resolvedBank) {
      setCreateError('Please select or enter a valid bank name');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        customerId: String(newPayment.customerId),
        amount: Number(newPayment.amount),
        instrumentType: newPayment.instrumentType,
        bankName: resolvedBank,
        referenceNumber: newPayment.referenceNumber.trim(),
        referenceDate: newPayment.referenceDate,
        isInstallment: newPayment.isInstallment,
      };
      if (newPayment.bookingId) {
        payload.bookingId = String(newPayment.bookingId);
      }
      if (newPayment.notes?.trim()) {
        payload.notes = newPayment.notes.trim();
      }

      const created = await api.createPayment(payload);
      showToast('success', `BRV ${created.receiptNumber} recorded! Pending Finance confirmation.`);
      setShowCreateModal(false);
      setCreateError(null);
      setCustomBankName('');
      setNewPayment({
        customerId: '',
        bookingId: '',
        amount: 0,
        instrumentType: 'TRANSFER',
        bankName: 'Commercial Bank of Ethiopia (CBE)',
        referenceNumber: '',
        referenceDate: new Date().toISOString().split('T')[0],
        isInstallment: false,
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setCreateError(formatApiError(err, 'Payment recording failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async (id: string) => {
    if (!canConfirmPayment) return;
    setConfirmingId(id);
    try {
      const result = await api.confirmPayment(id);
      showToast('success', `Payment ${result.receiptNumber} confirmed! Ledger updated.`);
      loadData();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Confirmation failed'));
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRejectPayment) return;
    if (!rejectingPayment) return;
    setRejectError(null);
    if (!rejectionReason.trim()) {
      setRejectError('Rejection reason is mandatory for audit trail compliance');
      return;
    }
    setRejecting(true);
    try {
      const result = await api.rejectPayment(rejectingPayment.paymentId, rejectionReason.trim());
      showToast('success', `Payment ${result.receiptNumber} rejected`);
      setShowRejectModal(false);
      setRejectError(null);
      setRejectingPayment(null);
      loadData();
    } catch (err: any) {
      setRejectError(formatApiError(err, 'Rejection failed'));
    } finally {
      setRejecting(false);
    }
  };

  // Filtered customer bookings for modal
  const customerBookings = bookings.filter((b) => b.customerId === newPayment.customerId && b.bookingStatus !== 'CANCELLED');

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.receiptNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer?.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalConfirmed = payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalPending = payments
    .filter((p) => p.status === 'SUBMITTED')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingCount = payments.filter((p) => p.status === 'SUBMITTED').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Financial Engine</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Treasury & Receipts</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Bank Receipt Vouchers (BRV)</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Bank Receipt Voucher (BRV) & Customer Deposits
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Customer deposit intake, CPO/wire slip verification, Finance audit confirmation, and automated ledger postings
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {canRecordPayment && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} />
              Record BRV Deposit
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            color: notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{notification.msg}</span>
        </div>
      )}

      {/* Executive Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONFIRMED INFLOW</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={17} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            ETB {totalConfirmed.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            Posted directly to verified customer accounts
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING RECONCILIATION</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} color="var(--accent-amber)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            ETB {totalPending.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            {pendingCount} voucher(s) awaiting bank statement validation
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL BRVS ISSUED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {payments.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            Sequential accounting series `BRV-YYYY-XXXXX`
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {['', 'SUBMITTED', 'CONFIRMED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
            >
              {st === '' ? 'All Receipts' : st}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search BRV #, bank reference, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>BRV VOUCHER #</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PAYMENT METHOD & BANK</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PURPOSE / BOOKING</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>AMOUNT (ETB)</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading Deposit Vouchers...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const custName = p.customer?.fullName || 'Customer';
                  return (
                    <tr key={p.paymentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.95rem 1.15rem' }}>
                        <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {p.receiptNumber}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{custName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Code: {p.customer?.customerCode} • {p.customer?.customerType}
                        </div>
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {p.instrumentType}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {p.bankName} {p.referenceNumber ? `• Ref: ${p.referenceNumber}` : ''}
                        </div>
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem' }}>
                        {p.booking ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontFamily: 'monospace', fontWeight: 600 }}>
                            Booking: {p.booking.bookingNumber}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Account Balance</span>
                        )}
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>
                          ETB {Number(p.amount || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            p.status === 'CONFIRMED'
                              ? 'badge-emerald'
                              : p.status === 'SUBMITTED'
                              ? 'badge-amber'
                              : 'badge-rose'
                          }`}
                        >
                          {p.status}
                        </span>
                        {p.isInstallment && (
                          <div style={{ marginTop: '0.3rem' }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                fontWeight: 700,
                                background:
                                  p.installmentApprovalStatus === 'APPROVED'
                                    ? 'rgba(16, 185, 129, 0.15)'
                                    : p.installmentApprovalStatus === 'REJECTED'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : 'rgba(245, 158, 11, 0.15)',
                                color:
                                  p.installmentApprovalStatus === 'APPROVED'
                                    ? '#10b981'
                                    : p.installmentApprovalStatus === 'REJECTED'
                                    ? '#ef4444'
                                    : '#f59e0b',
                                border:
                                  p.installmentApprovalStatus === 'APPROVED'
                                    ? '1px solid rgba(16, 185, 129, 0.3)'
                                    : p.installmentApprovalStatus === 'REJECTED'
                                    ? '1px solid rgba(239, 68, 68, 0.3)'
                                    : '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              {p.installmentApprovalStatus === 'APPROVED'
                                ? '✓ CEO Approved'
                                : p.installmentApprovalStatus === 'REJECTED'
                                ? '✕ CEO Rejected'
                                : '⏳ CEO Approval Req'}
                            </span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {p.status === 'SUBMITTED' && (canConfirmPayment || canRejectPayment) && (
                            <>
                              {/* Story P14: CEO Approval Gate Button for Installment Payments */}
                              {p.isInstallment && p.installmentApprovalStatus === 'PENDING_CEO' && (
                                <button
                                  onClick={() => {
                                    setCeoPayment(p);
                                    setCeoReason('');
                                    setShowCeoModal(true);
                                  }}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    fontSize: '0.72rem',
                                    padding: '0.35rem 0.6rem',
                                    background: '#d97706',
                                    borderColor: '#b45309',
                                  }}
                                  title="Review Installment (Story P14: CEO Approval Gate)"
                                >
                                  <AlertTriangle size={12} />
                                  CEO Gate
                                </button>
                              )}
                              {canConfirmPayment && (
                              <button
                                onClick={() => handleConfirmPayment(p.paymentId)}
                                disabled={
                                  confirmingId === p.paymentId ||
                                  (p.isInstallment && p.installmentApprovalStatus !== 'APPROVED')
                                }
                                className="btn btn-cyan btn-sm"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  opacity:
                                    p.isInstallment && p.installmentApprovalStatus !== 'APPROVED'
                                      ? 0.45
                                      : 1,
                                  cursor:
                                    p.isInstallment && p.installmentApprovalStatus !== 'APPROVED'
                                      ? 'not-allowed'
                                      : 'pointer',
                                }}
                                title={
                                  p.isInstallment && p.installmentApprovalStatus !== 'APPROVED'
                                    ? 'Story P14: Requires CEO approval before ledger confirmation'
                                    : 'Finance Confirm & Post to Ledger'
                                }
                              >
                                <FileCheck size={13} />
                                {confirmingId === p.paymentId ? 'Posting...' : 'Confirm'}
                              </button>
                              )}
                              {canRejectPayment && (
                              <button
                                onClick={() => {
                                  setRejectingPayment(p);
                                  setShowRejectModal(true);
                                }}
                                className="btn btn-secondary btn-sm"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  color: 'var(--accent-rose)',
                                  borderColor: 'rgba(244, 63, 94, 0.4)',
                                }}
                                title="Reject Voucher with Audit Reason"
                              >
                                <XCircle size={13} />
                                Reject
                              </button>
                              )}
                            </>
                          )}
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="View Official BRV Voucher"
                          >
                            <Printer size={13} />
                          </button>
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

      {/* Modal: Create BRV Payment */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '660px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Record Bank Receipt Voucher (BRV)
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Deposit Recording & Bank Slip Reconciliation</span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePayment}>
              <div className="modal-body">
                <ModalErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Customer *</label>
                    <select
                      className="input"
                      value={newPayment.customerId}
                      onChange={(e) => setNewPayment({ ...newPayment, customerId: e.target.value, bookingId: '' })}
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

                  <div>
                    <label className="form-label">Linked Booking (Optional)</label>
                    <select
                      className="input"
                      value={newPayment.bookingId || ''}
                      onChange={(e) => setNewPayment({ ...newPayment, bookingId: e.target.value })}
                    >
                      <option value="">General Deposit (No Booking)</option>
                      {customerBookings.map((b) => (
                        <option key={b.bookingId} value={b.bookingId}>
                          {b.bookingNumber} - {b.item?.itemName} (Bal: ETB {Number(b.outstandingBalance).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Deposit Amount (ETB) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="input"
                      value={newPayment.amount || ''}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="e.g. 500000"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Reference Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={newPayment.referenceDate}
                      onChange={(e) => setNewPayment({ ...newPayment, referenceDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Story P14: Installment Deposit Toggle Card */}
                <div
                  style={{
                    background: newPayment.isInstallment ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: newPayment.isInstallment ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    marginBottom: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: newPayment.isInstallment ? '#f59e0b' : 'var(--text-primary)' }}>
                        Split / Installment Deposit Plan (Story P14)
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Customer is paying in installments. Requires mandatory <strong>CEO Approval Gate</strong> before ledger confirmation.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={newPayment.isInstallment}
                      onChange={(e) => setNewPayment({ ...newPayment, isInstallment: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#f59e0b', cursor: 'pointer' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Payment Method *</label>
                    <select
                      className="input"
                      value={newPayment.instrumentType}
                      onChange={(e) => setNewPayment({ ...newPayment, instrumentType: e.target.value as any })}
                      required
                    >
                      <option value="TRANSFER">Bank Wire Transfer</option>
                      <option value="BANK_DEPOSIT">Cashier Payment Order / Deposit Slip</option>
                      <option value="CHEQUE">Bank Cheque</option>
                      <option value="CASH">Cash Direct Deposit</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Deposit Bank Name *</label>
                    <select
                      className="input"
                      value={newPayment.bankName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewPayment({ ...newPayment, bankName: val });
                        if (val !== 'OTHER') setCustomBankName('');
                      }}
                      required
                    >
                      {ETHIOPIAN_BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b === 'OTHER' ? '+ Other Bank / Custom Financial Institution...' : b}
                        </option>
                      ))}
                    </select>

                    {newPayment.bankName === 'OTHER' && (
                      <div style={{ marginTop: '0.65rem' }}>
                        <input
                          type="text"
                          className="input"
                          value={customBankName}
                          onChange={(e) => setCustomBankName(e.target.value)}
                          placeholder="Type custom bank / financial institution name *"
                          required
                          autoFocus
                          style={{ borderColor: 'var(--accent-cyan)' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Bank Reference / Slip # *</label>
                  <input
                    type="text"
                    className="input"
                    value={newPayment.referenceNumber}
                    onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                    placeholder="TT / CPO / Slip ref code"
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Recording...' : 'Generate BRV Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Official BRV Receipt View / Print */}
      {selectedReceipt && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileCheck size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>KANAB MOTORS PRIVATE LIMITED COMPANY</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automotive Assembly & Import Logistics Division</div>
                </div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OFFICIAL VOUCHER</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
                    {selectedReceipt.receiptNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${selectedReceipt.status === 'CONFIRMED' ? 'badge-emerald' : 'badge-amber'}`}>
                    {selectedReceipt.status}
                  </span>
                </div>
              </div>

              {/* Voucher Body Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Received From (Customer):</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1.05rem', marginTop: '0.2rem' }}>
                    {selectedReceipt.customer?.fullName || 'Customer'}
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>Code: {selectedReceipt.customer?.customerCode}</div>
                  <div style={{ color: 'var(--text-secondary)' }}>TIN: {selectedReceipt.customer?.tinNumber || 'N/A'}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Particulars:</div>
                  <div style={{ marginTop: '0.2rem' }}><strong>Date:</strong> {new Date(selectedReceipt.paymentDate).toLocaleDateString()}</div>
                  <div><strong>Method:</strong> {selectedReceipt.instrumentType}</div>
                  <div><strong>Bank:</strong> {selectedReceipt.bankName}</div>
                  <div><strong>Bank Ref:</strong> {selectedReceipt.referenceNumber}</div>
                </div>
              </div>

              <div style={{ background: 'rgba(0, 210, 211, 0.08)', border: '1px solid rgba(0, 210, 211, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Received</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedReceipt.booking ? `Linked Booking: ${selectedReceipt.booking.bookingNumber}` : 'Account Credit'}
                  </div>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                  ETB {Number(selectedReceipt.amount).toLocaleString()}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <div>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)', marginBottom: '0.5rem', height: '24px' }}></div>
                  <div>Prepared By (Cashier)</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)', marginBottom: '0.5rem', height: '24px' }}></div>
                  <div>Checked By (Accountant)</div>
                </div>
                <div>
                  <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)', marginBottom: '0.5rem', height: '24px' }}></div>
                  <div>Authorized By (Finance Mgr)</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => window.print()} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Printer size={15} /> Print BRV
              </button>
              <button onClick={() => setSelectedReceipt(null)} className="btn btn-cyan">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reject BRV Payment */}
      {showRejectModal && rejectingPayment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-rose)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                    Reject Bank Receipt Voucher
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Voucher: {rejectingPayment.receiptNumber} (ETB {Number(rejectingPayment.amount).toLocaleString()})
                  </span>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <form onSubmit={handleRejectPayment}>
              <div className="modal-body">
                <ModalErrorAlert error={rejectError} onDismiss={() => setRejectError(null)} />
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Mandatory Audit Rejection Reason *</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide specific justification (e.g. Cheque returned due to insufficient drawer funds, Bank slip reference mismatch)..."
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⚠️ Rejecting this voucher transitions its status to <strong>REJECTED</strong> without posting any credit entry to the customer ledger.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="btn"
                  style={{ background: 'var(--accent-rose)', color: '#fff', border: 'none' }}
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Story P14 CEO Installment Approval Gate */}
      {showCeoModal && ceoPayment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#f59e0b',
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    CEO Installment Approval Gate
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Policy Story P14: Executive sign-off for partial deposits
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCeoModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Receipt #:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{ceoPayment.receiptNumber}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <strong>{ceoPayment.customer?.fullName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Installment Amount:</span>
                  <strong style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                    ETB {Number(ceoPayment.amount).toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Bank Reference:</span>
                  <span>{ceoPayment.bankName} · {ceoPayment.referenceNumber}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className="form-label">Approval Notes / Decision Remarks</label>
                <textarea
                  className="input"
                  rows={3}
                  value={ceoReason}
                  onChange={(e) => setCeoReason(e.target.value)}
                  placeholder="Optional justification or decision remarks..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={decidingCeo}
                  onClick={async () => {
                    setDecidingCeo(true);
                    try {
                      await api.decideCeoInstallmentApproval(ceoPayment.paymentId, {
                        approved: false,
                        reason: ceoReason || 'Installment rejected by CEO',
                      });
                      showToast('success', 'Installment payment rejected by CEO.');
                      setShowCeoModal(false);
                      loadData();
                    } catch (err: any) {
                      showToast('error', formatApiError(err, 'Failed to reject installment'));
                    } finally {
                      setDecidingCeo(false);
                    }
                  }}
                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  ✕ Reject Installment
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={decidingCeo}
                  onClick={async () => {
                    setDecidingCeo(true);
                    try {
                      await api.decideCeoInstallmentApproval(ceoPayment.paymentId, {
                        approved: true,
                        reason: ceoReason || 'Approved by CEO under executive discretion',
                      });
                      showToast('success', 'Installment payment approved by CEO! Ready for ledger confirmation.');
                      setShowCeoModal(false);
                      loadData();
                    } catch (err: any) {
                      showToast('error', formatApiError(err, 'Failed to approve installment'));
                    } finally {
                      setDecidingCeo(false);
                    }
                  }}
                  style={{ background: '#10b981', borderColor: '#059669' }}
                >
                  ✓ Approve Installment (CEO)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
