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
  Tag,
  Percent,
  ClipboardCheck,
  FileCheck2,
} from 'lucide-react';
import { api, SalesInvoice, Booking } from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { useModal } from '../../context/ModalContext';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

export const InvoicesPage: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { can } = usePermissions();
  const canCreateInvoice = can('PAYMENTS_RECORD');
  const canApproveInvoice = can('PAYMENTS_CONFIRM');
  const canRejectInvoice = can('PAYMENTS_REJECT');
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Story IV14: Module Tabs & WHT Hub state
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'WHT_HUB'>('INVOICES');
  const [whtCertificates, setWhtCertificates] = useState<any[]>([]);
  const [whtCertSearch, setWhtCertSearch] = useState('');
  const [whtStatusFilter, setWhtStatusFilter] = useState<string>('ALL');

  // WHT Settlement Modal state
  const [showWhtModal, setShowWhtModal] = useState(false);
  const [whtTargetInvoice, setWhtTargetInvoice] = useState<SalesInvoice | null>(null);
  const [whtAmount, setWhtAmount] = useState<number | string>(0);
  const [whtCertNumber, setWhtCertNumber] = useState('');
  const [whtCertDate, setWhtCertDate] = useState(new Date().toISOString().split('T')[0]);
  const [whtNotes, setWhtNotes] = useState('');
  const [whtError, setWhtError] = useState<string | null>(null);

  // Update Certificate Modal state
  const [showUpdateCertModal, setShowUpdateCertModal] = useState(false);
  const [updateCertInvoice, setUpdateCertInvoice] = useState<any | null>(null);
  const [newCertNumber, setNewCertNumber] = useState('');
  const [newCertDate, setNewCertDate] = useState('');
  const [newCertStatus, setNewCertStatus] = useState('CERTIFICATE_RECEIVED');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Error States
  const [createError, setCreateError] = useState<string | null>(null);
  const [rejectInvoiceId, setRejectInvoiceId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

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
      const [invRes, bkgRes, whtRes] = await Promise.all([
        api.getInvoices(),
        api.getBookings ? api.getBookings() : Promise.resolve([]),
        api.getWhtCertificates ? api.getWhtCertificates() : Promise.resolve([]),
      ]);
      setInvoices(invRes || []);
      setBookings(Array.isArray(bkgRes) ? bkgRes : (bkgRes as any)?.items || []);
      setWhtCertificates(whtRes || []);
    } catch (err: any) {
      setErrorMsg(formatApiError(err, 'Failed to load sales invoices and bookings'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhtModal = (invoice: SalesInvoice) => {
    setWhtTargetInvoice(invoice);
    const gross = Number(invoice.grossTotal) || 0;
    const basePrice = Number(invoice.unitPrice) * Number(invoice.quantity) || gross;
    // Standard 2% WHT on base price or remaining balance
    const suggestedWht = Math.round(basePrice * 0.02 * 100) / 100;
    const balance = Number(invoice.outstandingBalance) || 0;
    setWhtAmount(balance > 0 && balance < suggestedWht ? balance : suggestedWht);
    setWhtCertNumber(invoice.whtCertificateNumber || '');
    setWhtCertDate(invoice.whtCertificateDate || new Date().toISOString().split('T')[0]);
    setWhtNotes(`Tax withheld at source by withholding agent customer`);
    setWhtError(null);
    setShowWhtModal(true);
  };

  const handleRecordWhtSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whtTargetInvoice) return;
    try {
      setActionLoading(true);
      setWhtError(null);
      await api.recordWhtSettlement(whtTargetInvoice.invoiceId, {
        whtAmount: Number(whtAmount),
        certificateNumber: whtCertNumber.trim() || undefined,
        certificateDate: whtCertDate || undefined,
        notes: whtNotes.trim() || undefined,
      });
      setSuccessMsg(`Non-cash WHT settlement of ETB ${Number(whtAmount).toLocaleString()} recorded successfully! Customer ledger updated.`);
      setShowWhtModal(false);
      setWhtTargetInvoice(null);
      await loadData();
    } catch (err: any) {
      setWhtError(formatApiError(err, 'Failed to record WHT settlement'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenUpdateCert = (cert: any) => {
    setUpdateCertInvoice(cert);
    setNewCertNumber(cert.whtCertificateNumber || '');
    setNewCertDate(cert.whtCertificateDate || new Date().toISOString().split('T')[0]);
    setNewCertStatus(cert.whtStatus || 'CERTIFICATE_RECEIVED');
    setShowUpdateCertModal(true);
  };

  const handleSaveCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateCertInvoice) return;
    try {
      setActionLoading(true);
      await api.updateWhtCertificate(updateCertInvoice.invoiceId, {
        certificateNumber: newCertNumber.trim() || undefined,
        certificateDate: newCertDate || undefined,
        status: newCertStatus,
      });
      setSuccessMsg('WHT certificate details updated successfully!');
      setShowUpdateCertModal(false);
      setUpdateCertInvoice(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(formatApiError(err, 'Failed to update WHT certificate'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateInvoice) return;
    setCreateError(null);
    if (!selectedBookingId) {
      setCreateError('Please select a booking to invoice');
      return;
    }

    try {
      setActionLoading(true);
      setCreateError(null);
      await api.createInvoice({
        bookingId: selectedBookingId,
        taxRate,
        applyDeposits,
      });
      setSuccessMsg('Sales invoice generated and submitted to approval workflow successfully!');
      setShowCreateModal(false);
      setCreateError(null);
      setSelectedBookingId('');
      await loadData();
    } catch (err: any) {
      setCreateError(formatApiError(err, 'Failed to generate sales invoice'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (invoiceId: string) => {
    if (!canApproveInvoice) return;
    const confirmed = await showConfirm({
      title: 'Approve Sales Invoice & Settle',
      message: 'Approve this sales invoice? This will finalize financial settlement and automatically mark the assigned vehicle as SOLD.',
      confirmText: 'Approve & Settle',
      variant: 'success',
    });
    if (!confirmed) {
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
      const errText = formatApiError(err, 'Failed to approve sales invoice');
      setErrorMsg(errText);
      await showAlert({
        title: 'Invoice Approval Failed',
        message: errText,
        variant: 'danger',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (invoiceId: string) => {
    if (!canRejectInvoice) return;
    setRejectInvoiceId(invoiceId);
    setRejectReason('');
    setRejectError(null);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRejectInvoice || !rejectInvoiceId) return;
    setRejectError(null);
    if (!rejectReason.trim()) {
      setRejectError('Please specify a mandatory audit reason for rejection');
      return;
    }

    try {
      setActionLoading(true);
      await api.rejectInvoice(rejectInvoiceId, rejectReason.trim());
      setSuccessMsg('Sales invoice rejected.');
      setRejectInvoiceId(null);
      setRejectReason('');
      setRejectError(null);
      await loadData();
      if (selectedInvoice && selectedInvoice.invoiceId === rejectInvoiceId) {
        setSelectedInvoice(null);
      }
    } catch (err: any) {
      setRejectError(formatApiError(err, 'Failed to reject sales invoice'));
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
                Automated 15% VAT calculation, booking deposit allocation & vehicle sales settlement
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

      {/* Module Navigation Tabs (Story IV14) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('INVOICES')}
          className="btn"
          style={{
            background: activeTab === 'INVOICES' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
            color: activeTab === 'INVOICES' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            border: activeTab === 'INVOICES' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid transparent',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
          }}
        >
          <FileText size={16} />
          Commercial Sales Invoices ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab('WHT_HUB')}
          className="btn"
          style={{
            background: activeTab === 'WHT_HUB' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
            color: activeTab === 'WHT_HUB' ? '#c084fc' : 'var(--text-secondary)',
            border: activeTab === 'WHT_HUB' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
          }}
        >
          <Tag size={16} />
          Withholding Tax (WHT) Tracking Hub (Story IV14)
          {whtCertificates.filter((w) => !w.whtCertificateNumber || w.whtStatus === 'PENDING_CERTIFICATE').length > 0 && (
            <span style={{ padding: '0.15rem 0.45rem', borderRadius: '10px', background: '#f59e0b', color: '#000', fontSize: '0.7rem', fontWeight: 800 }}>
              {whtCertificates.filter((w) => !w.whtCertificateNumber || w.whtStatus === 'PENDING_CERTIFICATE').length} Missing
            </span>
          )}
        </button>
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

      {/* Commercial Invoices Tab Content */}
      {activeTab === 'INVOICES' && (
        <>
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
                      <div>{inv.invoiceNumber}</div>
                      {inv.whtCertificateNumber ? (
                        <div style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', fontSize: '0.7rem', fontWeight: 700 }}>
                          ✓ WHT Cert: {inv.whtCertificateNumber}
                        </div>
                      ) : (inv.whtApplicable || (inv.customer as any)?.withholdingTaxFlag) ? (
                        <div style={{ marginTop: '0.35rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', fontSize: '0.7rem', fontWeight: 700 }}>
                          ⏳ WHT 2% Pending Cert
                        </div>
                      ) : null}
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
                      {Number(inv.whtAmount || 0) > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#c084fc', fontWeight: 700, marginTop: '0.2rem' }}>
                          incl. ETB {Number(inv.whtAmount).toLocaleString()} WHT Non-Cash
                        </div>
                      )}
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

                        {canCreateInvoice && (
                          <button
                            onClick={() => handleOpenWhtModal(inv)}
                            title="Story IV14: Record Non-Cash Withholding Tax (WHT) Settlement"
                            style={{
                              padding: '0.4rem',
                              borderRadius: '6px',
                              border: '1px solid rgba(168, 85, 247, 0.4)',
                              background: 'rgba(168, 85, 247, 0.15)',
                              color: '#c084fc',
                              cursor: 'pointer',
                            }}
                          >
                            <Tag size={15} />
                          </button>
                        )}

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
                              onClick={() => handleOpenReject(inv.invoiceId)}
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
      </>
      )}

      {/* STORY IV14: WITHHOLDING TAX (WHT) TRACKING HUB */}
      {activeTab === 'WHT_HUB' && (
        <>
          {/* Statutory Rule Banner */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '8px', color: '#c084fc' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 800, color: '#c084fc' }}>
                SRS Story IV14: Customer Withholding Tax Compliance & Certificate Ledger
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Customers designated as withholding agents remit net cash to KANAB and withhold commercial tax (2%) at source. 
                Finance tracks all withheld tax deductions, physical certificate numbers, and claims against corporate income tax.
                <span style={{ display: 'block', marginTop: '0.35rem', color: '#f59e0b', fontWeight: 700 }}>
                  ★ Non-Refundable Statutory Rule: Withheld tax is credited to the customer ledger as non-cash and is never refundable upon booking cancellation.
                </span>
              </p>
            </div>
          </div>

          {/* WHT KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#a855f7' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>WHT Tracked Invoices</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                  <Tag size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                {whtCertificates.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Orders subject to 2% withholding
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#c084fc' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Tax Withheld (ETB)</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(192, 132, 252, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc' }}>
                  <Coins size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#c084fc', fontFamily: 'monospace' }}>
                ETB {whtCertificates.reduce((sum, w) => sum + Number(w.whtAmount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Non-cash credits posted to ledger
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Certificates on File</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                {whtCertificates.filter((w) => w.whtCertificateNumber && w.whtStatus !== 'PENDING_CERTIFICATE').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Verified & ready for tax credit claim
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Missing Certificates</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
                  <AlertCircle size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                {whtCertificates.filter((w) => !w.whtCertificateNumber || w.whtStatus === 'PENDING_CERTIFICATE').length}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Requires client follow-up
              </div>
            </div>
          </div>

          {/* Filter Bar & Table */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ position: 'relative', minWidth: '320px' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search by customer, TIN, invoice, or certificate #..."
                  value={whtCertSearch}
                  onChange={(e) => setWhtCertSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem 0.65rem 2.5rem',
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
                  value={whtStatusFilter}
                  onChange={(e) => setWhtStatusFilter(e.target.value)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="ALL">All Certificates</option>
                  <option value="MISSING">Missing Certificates (Action Required)</option>
                  <option value="RECEIVED">Verified On File</option>
                  <option value="CLAIMED">Claimed for Corporate Tax</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Invoice & Order</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Customer & TIN</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Gross Total (ETB)</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Cash via BRV</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Tax Withheld (2%)</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Certificate #</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Compliance Status</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {whtCertificates
                    .filter((c) => {
                      const term = whtCertSearch.toLowerCase();
                      const matchSearch =
                        (c.customerName && c.customerName.toLowerCase().includes(term)) ||
                        (c.tinNumber && c.tinNumber.toLowerCase().includes(term)) ||
                        (c.invoiceNumber && c.invoiceNumber.toLowerCase().includes(term)) ||
                        (c.whtCertificateNumber && c.whtCertificateNumber.toLowerCase().includes(term));
                      const isMissing = !c.whtCertificateNumber || c.whtStatus === 'PENDING_CERTIFICATE';
                      const matchStatus =
                        whtStatusFilter === 'ALL' ||
                        (whtStatusFilter === 'MISSING' && isMissing) ||
                        (whtStatusFilter === 'RECEIVED' && c.whtStatus === 'CERTIFICATE_RECEIVED') ||
                        (whtStatusFilter === 'CLAIMED' && c.whtStatus === 'CLAIMED');
                      return matchSearch && matchStatus;
                    })
                    .map((c) => {
                      const isMissing = !c.whtCertificateNumber || c.whtStatus === 'PENDING_CERTIFICATE';
                      return (
                        <tr key={c.invoiceId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                            <div>{c.invoiceNumber}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order: {c.bookingNumber || 'Direct'}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <div style={{ fontWeight: 600 }}>{c.customerName}</div>
                            <div style={{ fontSize: '0.75rem', color: '#c084fc', fontFamily: 'monospace' }}>
                              TIN: {c.tinNumber || '0012345678'}
                            </div>
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                            ETB {Number(c.grossTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981', fontWeight: 500 }}>
                            ETB {Math.max(0, Number(c.depositsApplied) - Number(c.whtAmount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#c084fc' }}>
                            ETB {Number(c.whtAmount || (Number(c.grossTotal) * 0.02)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 600 }}>
                            {c.whtCertificateNumber ? (
                              <span style={{ color: 'var(--text-primary)' }}>{c.whtCertificateNumber}</span>
                            ) : (
                              <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>Pending Certificate</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {c.whtStatus === 'CLAIMED' ? (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>
                                ★ Claimed Tax Credit
                              </span>
                            ) : !isMissing ? (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
                                ✓ Verified On File
                              </span>
                            ) : (
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700 }}>
                                ⏳ Missing Certificate
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            <button
                              onClick={() => handleOpenUpdateCert(c)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <FileCheck2 size={14} />
                              {isMissing ? 'Enter Cert #' : 'Edit Status'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Generate Sales Invoice
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Calculate automated 15% VAT, apply booking deposit & route to approval
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
              <div className="modal-body">
                <ModalErrorAlert error={createError} onDismiss={() => setCreateError(null)} />
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
                    Live Settlement Breakdown & Calculation Summary
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
                  Automatically apply booking deposits to invoice settlement
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <FileText size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Invoice Ref: {selectedInvoice.invoiceNumber}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Customer settlement breakdown, VAT audit & approval status
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
                    onClick={() => handleOpenReject(selectedInvoice.invoiceId)}
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

      {/* REJECT INVOICE MODAL */}
      {rejectInvoiceId && (
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
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--accent-rose)' }}>
                    Reject Sales Invoice
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Provide mandatory audit justification for invoice rejection
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectInvoiceId(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                <ModalErrorAlert error={rejectError} onDismiss={() => setRejectError(null)} />
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Audit Rejection Reason *</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejecting sales invoice..."
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setRejectInvoiceId(null)}
                  className="btn btn-secondary"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORY IV14: RECORD NON-CASH WHT SETTLEMENT MODAL */}
      {showWhtModal && whtTargetInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius-md)', color: '#c084fc' }}>
                  <Tag size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Record Customer WHT Non-Cash Settlement
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>
                    Story IV14: Atomic WHT_SETTLEMENT credit posting & non-refundable deduction
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWhtModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordWhtSettlement}>
              <div className="modal-body">
                <ModalErrorAlert error={whtError} onDismiss={() => setWhtError(null)} />

                {/* Statutory rule card */}
                <div style={{ background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={16} />
                    SRS §IV14 Non-Cash Settlement Mandate
                  </div>
                  <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    The customer is a designated withholding tax agent who withheld tax at source. This posts a <strong>WHT_SETTLEMENT</strong> credit linked to invoice <strong>{whtTargetInvoice.invoiceNumber}</strong> and booking. No cash reached KANAB.
                    <div style={{ marginTop: '0.4rem', color: '#f59e0b', fontWeight: 600 }}>
                      ⚠️ Statutory Requirement: This credit is strictly non-refundable. If cancelled, KANAB refunds only actual cash received.
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <div style={{ fontWeight: 700 }}>{whtTargetInvoice.customer?.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TIN: {whtTargetInvoice.customer?.tinNumber || '0012345678'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Gross Invoice Total:</span>
                    <div style={{ fontWeight: 700 }}>ETB {Number(whtTargetInvoice.grossTotal).toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Cash Received via BRV:</span>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>ETB {Number(whtTargetInvoice.depositsApplied).toLocaleString()}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Current Invoice Balance:</span>
                    <div style={{ fontWeight: 700, color: Number(whtTargetInvoice.outstandingBalance) > 0 ? '#f59e0b' : '#10b981' }}>
                      ETB {Number(whtTargetInvoice.outstandingBalance).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Withheld Tax Amount (ETB) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={whtAmount}
                      onChange={(e) => setWhtAmount(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Standard 2% Commercial WHT
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Withholding Certificate # *
                    </label>
                    <input
                      type="text"
                      value={whtCertNumber}
                      onChange={(e) => setWhtCertNumber(e.target.value)}
                      placeholder="e.g. 01243 or WHT-2026-0089"
                      required
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                      }}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Official Tax Authority Certificate #
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Certificate Issue Date
                    </label>
                    <input
                      type="date"
                      value={whtCertDate}
                      onChange={(e) => setWhtCertDate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                      Audit Notes
                    </label>
                    <input
                      type="text"
                      value={whtNotes}
                      onChange={(e) => setWhtNotes(e.target.value)}
                      placeholder="e.g. Tax withheld at source, certificate 01243"
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Atomic Ledger Posting Preview */}
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Live Customer Ledger Atomic Posting Preview (Story IV14)
                  </div>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ color: '#64748b', borderBottom: '1px solid #1e293b' }}>
                        <th style={{ textAlign: 'left', padding: '0.3rem 0' }}>Transaction Entry</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0' }}>Debit (ETB)</th>
                        <th style={{ textAlign: 'right', padding: '0.3rem 0' }}>Credit (ETB)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ color: '#e2e8f0' }}>
                        <td style={{ padding: '0.3rem 0' }}>Sales Invoice ({whtTargetInvoice.invoiceNumber})</td>
                        <td style={{ textAlign: 'right' }}>{Number(whtTargetInvoice.grossTotal).toLocaleString()}</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                      </tr>
                      <tr style={{ color: '#10b981' }}>
                        <td style={{ padding: '0.3rem 0' }}>Bank Receipt Voucher (Cash Received)</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right' }}>{Number(whtTargetInvoice.depositsApplied).toLocaleString()}</td>
                      </tr>
                      <tr style={{ color: '#c084fc', fontWeight: 700 }}>
                        <td style={{ padding: '0.3rem 0' }}>Tax withheld at source, cert {whtCertNumber || 'PENDING'}</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right' }}>{Number(whtAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr style={{ color: '#38bdf8', borderTop: '1px solid #334155', fontWeight: 800 }}>
                        <td style={{ padding: '0.4rem 0' }}>Net Outstanding Customer Balance</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right' }}>
                          ETB {Math.max(0, Number(whtTargetInvoice.outstandingBalance) - Number(whtAmount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowWhtModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !whtAmount || Number(whtAmount) <= 0}
                  className="btn"
                  style={{
                    background: '#a855f7',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                >
                  {actionLoading ? 'Posting...' : 'Confirm & Post WHT Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STORY IV14: UPDATE CERTIFICATE MODAL */}
      {showUpdateCertModal && updateCertInvoice && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 'var(--radius-md)', color: '#c084fc' }}>
                  <FileCheck2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Update WHT Certificate
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#c084fc' }}>
                    Invoice: {updateCertInvoice.invoiceNumber} · Customer: {updateCertInvoice.customerName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateCertModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCertificate}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Withholding Tax Certificate # *
                  </label>
                  <input
                    type="text"
                    value={newCertNumber}
                    onChange={(e) => setNewCertNumber(e.target.value)}
                    placeholder="Enter official certificate number..."
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Certificate Date
                  </label>
                  <input
                    type="date"
                    value={newCertDate}
                    onChange={(e) => setNewCertDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                    Compliance & Tax Claim Status
                  </label>
                  <select
                    value={newCertStatus}
                    onChange={(e) => setNewCertStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="CERTIFICATE_RECEIVED">✓ Certificate Received & On File</option>
                    <option value="PENDING_CERTIFICATE">⏳ Missing Certificate (Pending Follow-up)</option>
                    <option value="CLAIMED">★ Claimed as Tax Credit against KANAB Corporate Tax</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowUpdateCertModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn btn-cyan"
                  style={{ fontWeight: 700 }}
                >
                  {actionLoading ? 'Saving...' : 'Save Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoicesPage;

