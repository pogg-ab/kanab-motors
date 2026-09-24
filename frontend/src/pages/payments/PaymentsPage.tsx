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

export const PaymentsPage: React.FC = () => {
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
    notes?: string;
  }>({
    customerId: '',
    bookingId: '',
    amount: 0,
    instrumentType: 'TRANSFER',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    referenceNumber: '',
    referenceDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

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
      showToast('error', err.message || 'Failed to load payments data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.customerId || !newPayment.amount || newPayment.amount <= 0) {
      showToast('error', 'Customer and positive amount are required');
      return;
    }

    const resolvedBank =
      newPayment.bankName === 'OTHER' ? customBankName.trim() : (newPayment.bankName || customBankName.trim());
    if (!resolvedBank) {
      showToast('error', 'Please select or enter a valid bank name');
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
      setCustomBankName('');
      setNewPayment({
        customerId: '',
        bookingId: '',
        amount: 0,
        instrumentType: 'TRANSFER',
        bankName: 'Commercial Bank of Ethiopia (CBE)',
        referenceNumber: '',
        referenceDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Payment recording failed');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async (id: string) => {
    setConfirmingId(id);
    try {
      const result = await api.confirmPayment(id);
      showToast('success', `Payment ${result.receiptNumber} confirmed! Ledger updated.`);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Confirmation failed');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingPayment) return;
    if (!rejectionReason.trim()) {
      showToast('error', 'Rejection reason is mandatory');
      return;
    }
    setRejecting(true);
    try {
      const result = await api.rejectPayment(rejectingPayment.paymentId, rejectionReason.trim());
      showToast('success', `Payment ${result.receiptNumber} rejected`);
      setShowRejectModal(false);
      setRejectingPayment(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Rejection failed');
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
          <button onClick={() => setShowCreateModal(true)} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            Record BRV Deposit
          </button>
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
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
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
                      </td>
                      <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {p.status === 'SUBMITTED' && (
                            <>
                              <button
                                onClick={() => handleConfirmPayment(p.paymentId)}
                                disabled={confirmingId === p.paymentId}
                                className="btn btn-cyan btn-sm"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                title="Finance Confirm & Post to Ledger"
                              >
                                <FileCheck size={13} />
                                {confirmingId === p.paymentId ? 'Posting...' : 'Confirm'}
                              </button>
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
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Record Bank Receipt Voucher (BRV)
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Official Deposit Recording & Bank Slip Reconciliation</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreatePayment}>
              <div className="modal-body">
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
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>KANAB MOTORS PRIVATE LIMITED COMPANY</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automotive Assembly & Import Logistics Division</div>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
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
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                  Reject Bank Receipt Voucher
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Voucher: {rejectingPayment.receiptNumber} (ETB {Number(rejectingPayment.amount).toLocaleString()})
                </span>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleRejectPayment}>
              <div className="modal-body">
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
    </div>
  );
};
