import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  RefreshCw,
  Coins,
  ShieldCheck,
  Building,
  Car,
  Receipt,
  X,
} from 'lucide-react';
import { api, SalesInvoice, Booking } from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';

export const InvoicesPage: React.FC = () => {
  const { can } = usePermissions();
  const canCreateInvoice = can('PAYMENTS_RECORD');
  const canApproveInvoice = can('PAYMENTS_CONFIRM');
  const canRejectInvoice = can('PAYMENTS_REJECT');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    invoice: SalesInvoice;
    action: 'APPROVE' | 'REJECT';
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for Invoice generation
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [taxRate, setTaxRate] = useState<number>(0.15); // 15% Ethiopian standard VAT
  const [applyDeposits, setApplyDeposits] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [invRes, bkgRes] = await Promise.all([
        api.getInvoices(),
        api.getBookings ? api.getBookings() : Promise.resolve([]),
      ]);
      setInvoices(invRes || []);
      setBookings(Array.isArray(bkgRes) ? bkgRes : (bkgRes as any)?.items || []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load sales invoices and bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateInvoice) return;
    if (!selectedBookingId) {
      setErrorMsg('Please select a booking to invoice');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await api.createInvoice({
        bookingId: selectedBookingId,
        taxRate,
        applyDeposits,
      });
      setSuccessMsg('Sales invoice generated and submitted to approval workflow successfully!');
      setShowCreateModal(false);
      setSelectedBookingId('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate sales invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirmModal = (invoice: SalesInvoice, action: 'APPROVE' | 'REJECT') => {
    setConfirmModal({ invoice, action });
    setRejectionReason('');
    setErrorMsg(null);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmModal) return;
    const { invoice, action } = confirmModal;

    if (action === 'APPROVE') {
      if (!canApproveInvoice) return;
      try {
        setActionLoading(true);
        setErrorMsg(null);
        await api.approveInvoice(invoice.invoiceId, 'Invoice verified and approved by Finance');
        setSuccessMsg(`Sales invoice ${invoice.invoiceNumber} approved successfully! Vehicle transitioned to SOLD.`);
        setConfirmModal(null);
        if (selectedInvoice && selectedInvoice.invoiceId === invoice.invoiceId) {
          setSelectedInvoice(null);
        }
        await loadData();
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Failed to approve sales invoice');
      } finally {
        setActionLoading(false);
      }
    } else {
      if (!canRejectInvoice) return;
      if (!rejectionReason.trim()) {
        setErrorMsg('Please specify a rejection reason');
        return;
      }
      try {
        setActionLoading(true);
        setErrorMsg(null);
        await api.rejectInvoice(invoice.invoiceId, rejectionReason.trim());
        setSuccessMsg(`Sales invoice ${invoice.invoiceNumber} rejected.`);
        setConfirmModal(null);
        if (selectedInvoice && selectedInvoice.invoiceId === invoice.invoiceId) {
          setSelectedInvoice(null);
        }
        await loadData();
      } catch (err: any) {
        setErrorMsg(err.response?.data?.message || 'Failed to reject sales invoice');
      } finally {
        setActionLoading(false);
      }
    }
  };

  // Selected booking preview for modal
  const selectedBooking = bookings.find((b) => String(b.bookingId) === selectedBookingId);
  const previewQuantity = selectedBooking ? Number(selectedBooking.quantity) || 1 : 1;
  const previewUnitPrice = selectedBooking
    ? Number(selectedBooking.unitPrice) || Number(selectedBooking.grossTotal) / previewQuantity
    : 0;
  const previewSubtotal = previewQuantity * previewUnitPrice;
  const previewVat = Math.round(previewSubtotal * taxRate * 100) / 100;
  const previewGross = previewSubtotal + previewVat;
  const previewDeposits = selectedBooking ? Number(selectedBooking.totalAmountDeposited) || 0 : 0;
  const previewApplied = applyDeposits ? Math.min(previewDeposits, previewGross) : 0;
  const previewBalance = previewGross - previewApplied;
  const previewExcess = previewDeposits > previewGross;

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customer?.fullName && inv.customer.fullName.toLowerCase().includes(search.toLowerCase())) ||
      (inv.vehicleUnit?.chassisNumber && inv.vehicleUnit.chassisNumber.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // KPIs
  const totalGross = invoices.reduce((sum, inv) => sum + Number(inv.grossTotal || 0), 0);
  const pendingCount = invoices.filter((i) => i.status === 'PENDING_APPROVAL').length;
  const approvedCount = invoices.filter((i) => i.status === 'APPROVED').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.2), rgba(16, 185, 129, 0.2))',
                border: '1px solid rgba(0, 210, 211, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Receipt size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Sales Invoices & Settlement</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                Automated 15% Ethiopian VAT Computation, Booking Settlement & Audit-Ready Invoicing
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {canCreateInvoice && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-cyan"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            Generate Sales Invoice
          </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Invoices Issued
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {invoices.length}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Cumulative Gross Sales
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>
            ETB {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
          }}
        >
          <div style={{ color: '#f59e0b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending Approval
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#f59e0b' }}>
            {pendingCount}
          </div>
        </div>

        <div
          style={{
            padding: '1.25rem',
            borderRadius: '12px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <div style={{ color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Settled & Sold Invoices
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#10b981' }}>
            {approvedCount}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              flex: 1,
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, chassis VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              outline: 'none',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved & Settled</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Invoice #</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Item & Chassis</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Gross Total (ETB)</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Deposits Applied</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Balance Due</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading invoices...' : 'No sales invoices found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.invoiceId}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {inv.invoiceNumber}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {inv.customer?.fullName || 'N/A'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {inv.customer?.mobileNumber}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--text-primary)' }}>{inv.item?.itemName || 'Vehicle Item'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                        Chassis: {inv.vehicleUnit?.chassisNumber || 'Direct Allotted'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                      ETB {Number(inv.grossTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        VAT: ETB {Number(inv.vatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>
                      ETB {Number(inv.depositsApplied).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      {inv.excessPaymentFlag && (
                        <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700 }}>
                          ★ EXCESS DEPOSIT
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                      <span style={{ color: Number(inv.outstandingBalance) > 0 ? '#f59e0b' : '#10b981' }}>
                        ETB {Number(inv.outstandingBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background:
                            inv.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : inv.status === 'PENDING_APPROVAL'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : inv.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.15)'
                              : 'rgba(255, 255, 255, 0.1)',
                          color:
                            inv.status === 'APPROVED'
                              ? '#10b981'
                              : inv.status === 'PENDING_APPROVAL'
                              ? '#f59e0b'
                              : inv.status === 'REJECTED'
                              ? '#ef4444'
                              : 'var(--text-secondary)',
                          border: `1px solid ${
                            inv.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : inv.status === 'PENDING_APPROVAL'
                              ? 'rgba(245, 158, 11, 0.3)'
                              : 'rgba(239, 68, 68, 0.3)'
                          }`,
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          title="View Invoice Details"
                          style={{
                            padding: '0.4rem',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={15} />
                        </button>

                        {inv.status === 'PENDING_APPROVAL' && (canApproveInvoice || canRejectInvoice) && (
                          <>
                            {canApproveInvoice && (
                            <button
                              onClick={() => openConfirmModal(inv, 'APPROVE')}
                              title="Approve Invoice & Settle"
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle2 size={15} />
                            </button>
                            )}
                            {canRejectInvoice && (
                            <button
                              onClick={() => openConfirmModal(inv, 'REJECT')}
                              title="Reject Invoice"
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                            >
                              <XCircle size={15} />
                            </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '680px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(0, 210, 211, 0.12)',
                    border: '1px solid rgba(0, 210, 211, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Generate Sales Invoice
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Automated 15% VAT, Booking Deposit Allocation & Settlement (IV1–IV13)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Target Booking Order *
                  </label>
                  <select
                    className="input"
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select Confirmed / Allotted Booking --</option>
                    {bookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingNumber} — {b.customer?.fullName} ({b.item?.itemName}) [Deposited: ETB {Number(b.totalAmountDeposited || 0).toLocaleString()}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBooking && (
                  <div
                    style={{
                      background: 'rgba(2, 132, 199, 0.06)',
                      border: '1px solid var(--border-highlight)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                    }}
                  >
                    <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      Live Settlement Breakdown & Tax Computation
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div>Customer: <strong>{selectedBooking.customer?.fullName}</strong></div>
                      <div>Item: <strong>{selectedBooking.item?.itemName}</strong></div>
                      <div>Quantity: <strong>{previewQuantity} unit(s)</strong></div>
                      <div>Unit Price: <strong>ETB {previewUnitPrice.toLocaleString()}</strong></div>
                      <div>Subtotal: <strong>ETB {previewSubtotal.toLocaleString()}</strong></div>
                      <div>VAT Rate (15%): <strong style={{ color: 'var(--accent-cyan)' }}>+ ETB {previewVat.toLocaleString()}</strong></div>
                      <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--border-color)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                          <span>Total Gross Amount:</span>
                          <span style={{ color: 'var(--accent-cyan)' }}>ETB {previewGross.toLocaleString()}</span>
                        </div>
                      </div>
                      <div>Customer Deposited on Booking: <strong>ETB {previewDeposits.toLocaleString()}</strong></div>
                      <div>Deposits Allocated to Invoice: <strong style={{ color: 'var(--accent-emerald)' }}>- ETB {previewApplied.toLocaleString()}</strong></div>
                      <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                          <span>Net Balance Due:</span>
                          <span style={{ color: previewBalance > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                            ETB {previewBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {previewExcess && (
                        <div
                          style={{
                            gridColumn: '1 / -1',
                            padding: '0.6rem 0.85rem',
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '8px',
                            color: 'var(--accent-amber)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                          }}
                        >
                          ⚠️ Notice: Customer deposit exceeds invoice gross amount. Excess funds can be routed in Customer Excess Module.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="checkbox"
                    id="applyDep"
                    checked={applyDeposits}
                    onChange={(e) => setApplyDeposits(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                  />
                  <label htmlFor="applyDep" style={{ fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    Automatically apply booking deposits to invoice settlement (IV4)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedBookingId}
                  className="btn btn-cyan"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Receipt size={16} />
                  {actionLoading ? 'Generating...' : 'Confirm & Submit to Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedInvoice && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoice(null);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(0, 210, 211, 0.12)',
                    border: '1px solid rgba(0, 210, 211, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {selectedInvoice.invoiceNumber}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Sales Invoice & Settlement Record
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Customer:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.customer?.fullName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Item:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.item?.itemName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chassis / VIN:</span>
                  <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {selectedInvoice.vehicleUnit?.chassisNumber || 'Direct Allotted Unit'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Status:</span>
                  <div>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          selectedInvoice.status === 'APPROVED'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : selectedInvoice.status === 'REJECTED'
                            ? 'rgba(239, 68, 68, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                        color:
                          selectedInvoice.status === 'APPROVED'
                            ? '#10b981'
                            : selectedInvoice.status === 'REJECTED'
                            ? '#ef4444'
                            : '#f59e0b',
                      }}
                    >
                      {selectedInvoice.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Unit Price:</span>
                  <div>ETB {Number(selectedInvoice.unitPrice).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>VAT (15%):</span>
                  <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    + ETB {Number(selectedInvoice.vatAmount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Gross Total:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    ETB {Number(selectedInvoice.grossTotal).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Deposits Applied:</span>
                  <div style={{ fontWeight: 600, color: 'var(--accent-emerald)' }}>
                    - ETB {Number(selectedInvoice.depositsApplied).toLocaleString()}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Outstanding Balance:</span>
                    <span style={{ color: Number(selectedInvoice.outstandingBalance) > 0 ? 'var(--accent-amber)' : 'var(--accent-emerald)' }}>
                      ETB {Number(selectedInvoice.outstandingBalance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedInvoice.status === 'PENDING_APPROVAL' && (canApproveInvoice || canRejectInvoice) && (
                <>
                  {canApproveInvoice && (
                    <button
                      onClick={() => openConfirmModal(selectedInvoice, 'APPROVE')}
                      className="btn btn-emerald"
                      style={{ background: '#10b981', color: '#000', fontWeight: 700 }}
                    >
                      Approve & Settle
                    </button>
                  )}
                  {canRejectInvoice && (
                    <button
                      onClick={() => openConfirmModal(selectedInvoice, 'REJECT')}
                      className="btn btn-rose"
                      style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                    >
                      Reject
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION (APPROVE / REJECT) POPUP MODAL */}
      {confirmModal && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setConfirmModal(null);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background:
                      confirmModal.action === 'APPROVE'
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${
                      confirmModal.action === 'APPROVE'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'
                    }`,
                    borderRadius: 'var(--radius-md)',
                    color: confirmModal.action === 'APPROVE' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {confirmModal.action === 'APPROVE' ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {confirmModal.action === 'APPROVE'
                      ? 'Approve Sales Invoice'
                      : 'Reject Sales Invoice'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: confirmModal.action === 'APPROVE' ? '#10b981' : '#ef4444' }}>
                    {confirmModal.invoice.invoiceNumber} — {confirmModal.invoice.customer?.fullName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="btn btn-secondary"
                disabled={actionLoading}
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chassis / VIN</span>
                    <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {confirmModal.invoice.vehicleUnit?.chassisNumber || 'Direct Allotted Unit'}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Item Model</span>
                    <div style={{ fontWeight: 600 }}>
                      {confirmModal.invoice.item?.itemName}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Gross Total (inc. 15% VAT)</span>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      ETB {Number(confirmModal.invoice.grossTotal).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Deposits Allocated</span>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>
                      ETB {Number(confirmModal.invoice.depositsApplied).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {confirmModal.action === 'APPROVE' ? (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    color: '#10b981',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Approval Impact:</strong> This will confirm full financial settlement, allocate customer advance deposits, and transition vehicle status to <strong>SOLD</strong>.
                </div>
              ) : (
                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Rejection Reason *
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejecting this sales invoice (e.g. Price mismatch, payment dispute)..."
                    rows={3}
                    className="input"
                    style={{ width: '100%', resize: 'none' }}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={actionLoading || (confirmModal.action === 'REJECT' && !rejectionReason.trim())}
                className={confirmModal.action === 'APPROVE' ? 'btn btn-emerald' : 'btn btn-rose'}
                style={{
                  background: confirmModal.action === 'APPROVE' ? '#10b981' : '#ef4444',
                  color: confirmModal.action === 'APPROVE' ? '#000' : '#fff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {confirmModal.action === 'APPROVE' ? (
                  <>
                    <CheckCircle2 size={16} />
                    {actionLoading ? 'Approving...' : 'Confirm Approval & Mark SOLD'}
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoicesPage;
