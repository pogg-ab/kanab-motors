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

  const handleApprove = async (invoiceId: string) => {
    if (!canApproveInvoice) return;
    if (!window.confirm('Approve this sales invoice? This will finalize financial settlement and mark vehicle as SOLD.')) {
      return;
    }
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await api.approveInvoice(invoiceId, 'Invoice verified and approved by Finance');
      setSuccessMsg('Sales invoice approved successfully! Vehicle transitioned to SOLD.');
      await loadData();
      if (selectedInvoice && selectedInvoice.invoiceId === invoiceId) {
        setSelectedInvoice(null);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to approve sales invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (invoiceId: string) => {
    if (!canRejectInvoice) return;
    const reason = window.prompt('Enter rejection reason:');
    if (reason === null) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await api.rejectInvoice(invoiceId, reason || 'Invoice rejected');
      setSuccessMsg('Sales invoice rejected.');
      await loadData();
      if (selectedInvoice && selectedInvoice.invoiceId === invoiceId) {
        setSelectedInvoice(null);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to reject sales invoice');
    } finally {
      setActionLoading(false);
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
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Financial Settlement</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Invoicing & Taxation</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Sales Invoices & VAT Settlement</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Sales Invoices & Settlement
              </h1>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                KMSICAMS-6 Sub-module 1: Automated 15% VAT, Booking Deposit Allocation & Vehicle Status Transition (IV1–IV13)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              onClick={loadData}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            {canCreateInvoice && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} />
                Generate Sales Invoice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: 'var(--accent-rose)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: 'var(--accent-emerald)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{successMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Invoices Issued</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
            {invoices.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Commercial & proforma records
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cumulative Gross Sales</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Coins size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
            ETB {totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Gross total volume (incl. 15% VAT)
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Approval</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
            {pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Awaiting central approval authorization
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Settled & Sold Invoices</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
            {approvedCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Finalized and ready for handover release
          </div>
        </div>
      </div>

      {/* Invoices Table Card */}
      <div
        className="card"
        style={{
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ position: 'relative', width: '380px', maxWidth: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by invoice #, customer name, chassis VIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
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

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice #</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item & Chassis</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Gross Total (ETB)</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Deposits Applied</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Balance Due</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
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
                              onClick={() => handleApprove(inv.invoiceId)}
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
                              onClick={() => handleReject(inv.invoiceId)}
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
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0, 210, 211, 0.12)', border: '1px solid rgba(0, 210, 211, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <Receipt size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Generate Sales Invoice</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body">
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Target Booking Order *
                </label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                  }}
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
                    background: 'rgba(0, 210, 211, 0.05)',
                    border: '1px solid rgba(0, 210, 211, 0.2)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>
                    Live Settlement Engine Breakdown (Stories IV2, IV4, IV5, IV6)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>Customer: <strong>{selectedBooking.customer?.fullName}</strong></div>
                    <div>Item: <strong>{selectedBooking.item?.itemName}</strong></div>
                    <div>Quantity: <strong>{previewQuantity} unit(s)</strong></div>
                    <div>Unit Price: <strong>ETB {previewUnitPrice.toLocaleString()}</strong></div>
                    <div>Subtotal: <strong>ETB {previewSubtotal.toLocaleString()}</strong></div>
                    <div>VAT Rate (15%): <strong style={{ color: 'var(--accent-cyan)' }}>+ ETB {previewVat.toLocaleString()}</strong></div>
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
                        <span>Total Gross Amount:</span>
                        <span style={{ color: 'var(--accent-cyan)' }}>ETB {previewGross.toLocaleString()}</span>
                      </div>
                    </div>
                    <div>Customer Deposited on Booking: <strong>ETB {previewDeposits.toLocaleString()}</strong></div>
                    <div>Deposits Allocated to Invoice: <strong style={{ color: '#10b981' }}>- ETB {previewApplied.toLocaleString()}</strong></div>
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                        <span>Net Balance Due:</span>
                        <span style={{ color: previewBalance > 0 ? '#f59e0b' : '#10b981' }}>
                          ETB {previewBalance.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {previewExcess && (
                      <div
                        style={{
                          gridColumn: '1 / -1',
                          padding: '0.5rem',
                          background: 'rgba(245, 158, 11, 0.15)',
                          borderRadius: '6px',
                          color: '#f59e0b',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="applyDep"
                  checked={applyDeposits}
                  onChange={(e) => setApplyDeposits(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                />
                <label htmlFor="applyDep" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
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
                >
                  {actionLoading ? 'Generating...' : 'Confirm & Submit to Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(0, 210, 211, 0.12)', border: '1px solid rgba(0, 210, 211, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <FileText size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.customer?.fullName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Item:</span>
                  <div style={{ fontWeight: 600 }}>{selectedInvoice.item?.itemName}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Chassis / VIN:</span>
                  <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                    {selectedInvoice.vehicleUnit?.chassisNumber || 'Direct Allotted Unit'}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                  <div><strong>{selectedInvoice.status}</strong></div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Unit Price:</span>
                  <div>ETB {Number(selectedInvoice.unitPrice).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>VAT (15%):</span>
                  <div style={{ color: 'var(--accent-cyan)' }}>ETB {Number(selectedInvoice.vatAmount).toLocaleString()}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Total:</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                    ETB {Number(selectedInvoice.grossTotal).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Deposits Applied:</span>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>
                    ETB {Number(selectedInvoice.depositsApplied).toLocaleString()}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                    <span>Outstanding Balance:</span>
                    <span style={{ color: Number(selectedInvoice.outstandingBalance) > 0 ? '#f59e0b' : '#10b981' }}>
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
                    onClick={() => handleApprove(selectedInvoice.invoiceId)}
                    className="btn btn-emerald"
                  >
                    Approve & Settle
                  </button>
                  )}
                  {canRejectInvoice && (
                  <button
                    onClick={() => handleReject(selectedInvoice.invoiceId)}
                    className="btn btn-danger"
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
    </div>
  );
};
export default InvoicesPage;
