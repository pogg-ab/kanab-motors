import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Package,
  Trash2,
  Check,
  XCircle,
  Eye,
  Send,
  Edit3,
  ArrowRight,
  TrendingUp,
  Building2,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  api,
  ImportRequisition,
  ImportRequisitionLine,
  ProductItem,
  Supplier,
  CompanyBankAccount,
  StockOrderReview,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

interface RequisitionFormLine {
  itemId: string;
  quantityRequested: number | string;
  estimatedUnitPrice: number | string;
  technicalSpecification?: string;
  qualityRequirements?: string;
  intendedApplication?: string;
  notes?: string;
}

export const ImportRequisitionsPage: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('PURCHASE_ORDERS_CREATE') || user?.role?.roleName === 'ADMIN';
  const canApprove = hasPermission('PURCHASE_ORDERS_CONFIRM') || user?.role?.roleName === 'ADMIN';

  const [requisitions, setRequisitions] = useState<ImportRequisition[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedReq, setSelectedReq] = useState<ImportRequisition | null>(null);
  const [editingReq, setEditingReq] = useState<ImportRequisition | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [showConvertModal, setShowConvertModal] = useState<boolean>(false);
  const [showStockReviewModal, setShowStockReviewModal] = useState<boolean>(false);
  const [selectedItemReview, setSelectedItemReview] = useState<StockOrderReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState<boolean>(false);

  // Form State
  const [businessUnitId, setBusinessUnitId] = useState<string>('Fleet & Commercial Vehicle Assembly');
  const [currency, setCurrency] = useState<string>('USD');
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<number | string>('');
  const [lines, setLines] = useState<RequisitionFormLine[]>([
    { itemId: '', quantityRequested: 1, estimatedUnitPrice: '' },
  ]);

  // Convert to PO Form State
  const [convertSupplierId, setConvertSupplierId] = useState<number | ''>('');
  const [convertIncoterms, setConvertIncoterms] = useState<string>('FOB');
  const [convertPaymentTerms, setConvertPaymentTerms] = useState<string>(
    '30% Advance T/T, 70% against Bill of Lading',
  );
  const [convertPortLoading, setConvertPortLoading] = useState<string>('Nhava Sheva (JNPT), Mumbai, India');
  const [convertPortDischarge, setConvertPortDischarge] = useState<string>(
    'Djibouti Free Port / Mojo Dry Port',
  );
  const [convertModeShipment, setConvertModeShipment] = useState<string>('SEA');
  const [convertBankAccountId, setConvertBankAccountId] = useState<number | ''>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
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
      const [reqsRes, prodsRes, suppsRes, banksRes] = await Promise.all([
        api.getImportRequisitions(),
        api.getItems(),
        api.getSuppliers('', true),
        api.getCompanyBankAccounts(),
      ]);
      setRequisitions(reqsRes.items || []);
      setProducts(prodsRes.items || []);
      setSuppliers(suppsRes || []);
      setBankAccounts(banksRes || []);
      if (banksRes && banksRes.length > 0) {
        setConvertBankAccountId(banksRes[0].bankAccountId);
      }
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load import requisitions'));
    } finally {
      setLoading(false);
    }
  };

  const handleStockReview = async (itemId: string) => {
    if (!itemId) return;
    setReviewLoading(true);
    setShowStockReviewModal(true);
    try {
      const review = await api.getStockReview(itemId);
      setSelectedItemReview(review);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to fetch inventory & pipeline review'));
      setShowStockReviewModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const resetForm = () => {
    setBusinessUnitId('Fleet & Commercial Vehicle Assembly');
    setCurrency('USD');
    setRequestDate(new Date().toISOString().split('T')[0]);
    setRequiredDeliveryDate('');
    setJustification('');
    setEstimatedBudget('');
    setLines([{ itemId: '', quantityRequested: 1, estimatedUnitPrice: '' }]);
    setFormError(null);
    setEditingReq(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (req: ImportRequisition) => {
    setEditingReq(req);
    setBusinessUnitId(req.businessUnitId);
    setCurrency(req.currency);
    setRequestDate(req.requestDate);
    setRequiredDeliveryDate(req.requiredDeliveryDate || '');
    setJustification(req.justification || '');
    setEstimatedBudget(req.estimatedBudget || '');
    setLines(
      req.lines.map((l) => ({
        itemId: l.itemId,
        quantityRequested: l.quantityRequested,
        estimatedUnitPrice: l.estimatedUnitPrice,
        technicalSpecification: l.technicalSpecification,
        qualityRequirements: l.qualityRequirements,
        intendedApplication: l.intendedApplication,
        notes: l.notes,
      })),
    );
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      {
        itemId: '',
        quantityRequested: 10,
        estimatedUnitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      showToast('error', 'Requisition must have at least one line item');
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof RequisitionFormLine, val: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: val };

    if (field === 'itemId') {
      const prod = products.find((p) => p.itemId === val);
      if (prod) {
        updated[index].estimatedUnitPrice = Number(prod.sellingPrice || 0);
      }
    }
    setLines(updated);
  };

  const calculateFormTotal = () => {
    return lines.reduce((acc, l) => acc + Number(l.quantityRequested || 0) * Number(l.estimatedUnitPrice || 0), 0);
  };

  const handleSubmitRequisitionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    for (const l of lines) {
      if (!l.itemId) {
        setFormError('Please select a product for all line items');
        return;
      }
      if (Number(l.quantityRequested) < 1) {
        setFormError('Quantity requested must be at least 1');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        businessUnitId,
        currency,
        requestDate,
        requiredDeliveryDate: requiredDeliveryDate || undefined,
        justification: justification.trim(),
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : calculateFormTotal(),
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantityRequested: Number(l.quantityRequested),
          estimatedUnitPrice: Number(l.estimatedUnitPrice || 0),
          technicalSpecification: l.technicalSpecification?.trim(),
          qualityRequirements: l.qualityRequirements?.trim(),
          intendedApplication: l.intendedApplication?.trim(),
          notes: l.notes?.trim(),
        })),
        userId: user?.userId || 1,
      };

      if (editingReq) {
        await api.updateImportRequisition(editingReq.requisitionId, payload);
        showToast('success', `Requisition ${editingReq.requisitionNumber} updated successfully`);
      } else {
        const created = await api.createImportRequisition(payload);
        showToast('success', `Import Requisition ${created.requisitionNumber} created in DRAFT status`);
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setFormError(formatApiError(err, 'Failed to save requisition'));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (id: string) => {
    try {
      const updated = await api.submitImportRequisition(id, user?.userId);
      showToast('success', `Requisition ${updated.requisitionNumber} submitted for management review`);
      loadData();
      if (selectedReq?.requisitionId === id) setSelectedReq(updated);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to submit requisition'));
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const updated = await api.approveImportRequisition(id, 'Approved for procurement', user?.userId);
      showToast('success', `Requisition ${updated.requisitionNumber} APPROVED for foreign purchase order`);
      loadData();
      if (selectedReq?.requisitionId === id) setSelectedReq(updated);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to approve requisition'));
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !rejectionReason.trim()) {
      showToast('error', 'Rejection reason is required');
      return;
    }
    try {
      const updated = await api.rejectImportRequisition(selectedReq.requisitionId, rejectionReason.trim(), user?.userId);
      showToast('success', `Requisition ${updated.requisitionNumber} REJECTED`);
      setShowRejectModal(false);
      setRejectionReason('');
      loadData();
      if (selectedReq?.requisitionId === updated.requisitionId) setSelectedReq(updated);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to reject requisition'));
    }
  };

  const handleConvertToPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !convertSupplierId) {
      showToast('error', 'Please select an authorized supplier');
      return;
    }

    setSaving(true);
    try {
      const po = await api.convertRequisitionToPO(
        selectedReq.requisitionId,
        {
          supplierId: Number(convertSupplierId),
          incoterms: convertIncoterms,
          paymentTerms: convertPaymentTerms,
          portOfLoading: convertPortLoading,
          portOfDischarge: convertPortDischarge,
          modeOfShipment: convertModeShipment,
          bankAccountId: convertBankAccountId ? Number(convertBankAccountId) : undefined,
        },
        user?.userId,
      );

      showToast('success', `Purchase Order ${po.poNumber} generated successfully from Requisition ${selectedReq.requisitionNumber}!`);
      setShowConvertModal(false);
      loadData();
      if (selectedReq) {
        setSelectedReq({ ...selectedReq, status: 'CONVERTED_TO_PO' });
      }
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to convert requisition to PO'));
    } finally {
      setSaving(false);
    }
  };

  const filteredRequisitions = requisitions.filter((r) => {
    const matchesSearch =
      r.requisitionNumber.toLowerCase().includes(search.toLowerCase()) ||
      (r.justification || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.businessUnitId || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge badge-secondary" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94A3B8' }}>DRAFT</span>;
      case 'SUBMITTED':
        return <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}><Clock size={12} className="inline mr-1" /> SUBMITTED</span>;
      case 'APPROVED':
        return <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}><CheckCircle2 size={12} className="inline mr-1" /> APPROVED</span>;
      case 'REJECTED':
        return <span className="badge badge-danger" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}><XCircle size={12} className="inline mr-1" /> REJECTED</span>;
      case 'CANCELLED':
        return <span className="badge badge-secondary">CANCELLED</span>;
      case 'CONVERTED_TO_PO':
        return <span className="badge badge-info" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06B6D4' }}><Check size={12} className="inline mr-1" /> CONVERTED TO PO</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  // Computed metrics for KPI cards
  const approvedReqs = requisitions.filter((r) => r.status === 'APPROVED');
  const draftReqs = requisitions.filter((r) => r.status === 'DRAFT');
  const submittedReqs = requisitions.filter((r) => r.status === 'SUBMITTED');
  const convertedReqs = requisitions.filter((r) => r.status === 'CONVERTED_TO_PO');
  const totalBudgetUSD = requisitions.reduce((sum, r) => sum + Number(r.estimatedBudget || 0), 0);
  const conversionRate = requisitions.length > 0 ? Math.round((convertedReqs.length / requisitions.length) * 100) : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            color: '#fff',
            background: notification.type === 'success' ? '#10B981' : '#EF4444',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Logistics & Import</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Procurement Planning</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Import Requisitions</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Import Requisition & Requirement Planning
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Business-unit demand review, live inventory safety buffers, approval governance, and single-click PO conversion
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {canManage && (
            <button onClick={handleOpenCreateModal} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} />
              New Import Requisition
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL REQUISITIONS
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{requisitions.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {approvedReqs.length} Approved
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for PO conversion</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              ESTIMATED PIPELINE BUDGET
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={17} color="var(--accent-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-indigo)', letterSpacing: '-0.01em', marginTop: '0.25rem' }}>
            USD {totalBudgetUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            Demand replenishment buffer across {requisitions.length} requests
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PO CONVERSION RATE
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {conversionRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            {convertedReqs.length} of {requisitions.length} requisitions converted to PO
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: '', label: `All Requisitions (${requisitions.length})` },
            { id: 'APPROVED', label: `Approved (${approvedReqs.length})` },
            { id: 'SUBMITTED', label: `Submitted (${submittedReqs.length})` },
            { id: 'CONVERTED_TO_PO', label: `Converted (${convertedReqs.length})` },
            { id: 'DRAFT', label: `Draft (${draftReqs.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by REQ #, justification, business unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REQUISITION REF</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REQUEST DATE</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>BUSINESS UNIT</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REQUESTED PRODUCTS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ESTIMATED BUDGET</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                    <div>Loading requisitions...</div>
                  </td>
                </tr>
              ) : filteredRequisitions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No import requisitions found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRequisitions.map((req) => {
                  const totalItems = req.lines?.length || 0;
                  const totalUnits = req.lines?.reduce((s, l) => s + Number(l.quantityRequested), 0) || 0;
                  return (
                    <tr key={req.requisitionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.95rem' }} className="font-mono">
                          {req.requisitionNumber}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {new Date(req.requestDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{req.businessUnitId}</div>
                        {req.requester && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            By: {req.requester.fullName || req.requester.username}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontSize: '0.825rem' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{totalItems} item(s)</span>
                          <span style={{ color: 'var(--text-muted)' }}> · {totalUnits} units total</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }} className="truncate max-w-xs">
                          {req.lines?.map((l) => l.item?.itemName).filter(Boolean).join(', ')}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} className="font-mono">
                        {req.currency} {Number(req.estimatedBudget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        {getStatusBadge(req.status)}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => setSelectedReq(req)}
                            className="btn btn-secondary btn-sm"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>

                          {(req.status === 'DRAFT' || req.status === 'REJECTED') && canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(req)}
                                className="btn btn-secondary btn-sm"
                                title="Edit"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleSubmitForApproval(req.requisitionId)}
                                className="btn btn-primary btn-sm"
                                title="Submit for Approval"
                              >
                                <Send size={14} />
                              </button>
                            </>
                          )}

                          {req.status === 'SUBMITTED' && canApprove && (
                            <>
                              <button
                                onClick={() => handleApprove(req.requisitionId)}
                                className="btn btn-success btn-sm"
                                title="Approve Requisition"
                                style={{ background: '#10B981', color: '#fff' }}
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReq(req);
                                  setShowRejectModal(true);
                                }}
                                className="btn btn-danger btn-sm"
                                title="Reject Requisition"
                                style={{ background: '#EF4444', color: '#fff' }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}

                          {req.status === 'APPROVED' && canManage && (
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setShowConvertModal(true);
                              }}
                              className="btn btn-cyan btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}
                            >
                              <span>Convert to PO</span>
                              <ArrowRight size={14} />
                            </button>
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

      {/* Create / Edit Requisition Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-400" size={20} />
                <h3 className="font-bold text-lg">
                  {editingReq ? `Edit Requisition ${editingReq.requisitionNumber}` : 'New Import Requisition Request'}
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisitionForm}>
              <div className="modal-body space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && <ModalErrorAlert error={formError} onDismiss={() => setFormError(null)} />}

                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Requesting Business Unit *</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={businessUnitId}
                      onChange={(e) => setBusinessUnitId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Request Date *</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Required Delivery Date</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={requiredDeliveryDate}
                      onChange={(e) => setRequiredDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Procurement Currency *</label>
                    <select
                      className="input w-full"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      required
                    >
                      <option value="USD">USD - United States Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="ETB">ETB - Ethiopian Birr</option>
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="AED">AED - UAE Dirham</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Business Justification / Project Rationale</label>
                    <input
                      type="text"
                      className="input w-full"
                      placeholder="e.g. Q4 Commercial fleet replenishment & CKD assembly parts"
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-400">Requisition Line Items</span>
                    <button type="button" onClick={handleAddLine} className="btn btn-secondary btn-sm flex items-center gap-1">
                      <Plus size={14} />
                      <span>Add Product Line</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table text-sm">
                      <thead>
                        <tr>
                          <th style={{ width: '35%' }}>Product *</th>
                          <th style={{ width: '15%' }}>Qty Requested *</th>
                          <th style={{ width: '20%' }}>Est. Unit Rate ({currency})</th>
                          <th style={{ width: '20%' }}>Line Total</th>
                          <th style={{ width: '10%' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, idx) => {
                          const total = Number(l.quantityRequested || 0) * Number(l.estimatedUnitPrice || 0);
                          return (
                            <React.Fragment key={idx}>
                              <tr>
                                <td>
                                  <select
                                    className="input w-full text-xs"
                                    value={l.itemId}
                                    onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                                    required
                                  >
                                    <option value="">Select Product...</option>
                                    {products.map((p) => (
                                      <option key={p.itemId} value={p.itemId}>
                                        {p.itemCode} - {p.itemName} ({p.category?.categoryName || 'Units'})
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className="input w-full text-xs"
                                    value={l.quantityRequested}
                                    onChange={(e) => handleLineChange(idx, 'quantityRequested', e.target.value)}
                                    required
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input w-full text-xs font-mono"
                                    value={l.estimatedUnitPrice}
                                    onChange={(e) => handleLineChange(idx, 'estimatedUnitPrice', e.target.value)}
                                    required
                                  />
                                </td>
                                <td className="font-mono font-bold text-xs">
                                  {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1">
                                    {l.itemId && (
                                      <button
                                        type="button"
                                        onClick={() => handleStockReview(l.itemId)}
                                        className="btn btn-secondary btn-sm p-1 text-cyan-400"
                                        title="View Live Stock & Pipeline Review"
                                      >
                                        <TrendingUp size={14} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLine(idx)}
                                      className="btn btn-danger btn-sm p-1"
                                      title="Remove Line"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={5} className="bg-slate-900/60 pb-3 pt-1 px-3">
                                  <input
                                    type="text"
                                    className="input w-full text-xs"
                                    placeholder="Technical specifications / quality requirements / intended application..."
                                    value={l.technicalSpecification || ''}
                                    onChange={(e) => handleLineChange(idx, 'technicalSpecification', e.target.value)}
                                  />
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end items-center pt-2 border-t border-slate-700 text-sm font-bold">
                    <span className="text-gray-400 mr-2">Estimated Grand Total:</span>
                    <span className="text-cyan-400 font-mono text-base">
                      {currency} {calculateFormTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingReq ? 'Save Changes' : 'Create Draft Requisition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Requisition Detail Modal */}
      {selectedReq && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-400" size={20} />
                <h3 className="font-bold text-lg">
                  Requisition Reference: <span className="font-mono text-cyan-400">{selectedReq.requisitionNumber}</span>
                </h3>
              </div>
              <button onClick={() => setSelectedReq(null)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                <div>
                  <span className="text-gray-400">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedReq.status)}</div>
                </div>
                <div>
                  <span className="text-gray-400">Request Date:</span>
                  <div className="font-bold mt-1">{new Date(selectedReq.requestDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-400">Estimated Budget:</span>
                  <div className="font-mono font-bold mt-1 text-cyan-400">
                    {selectedReq.currency} {Number(selectedReq.estimatedBudget || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Required Delivery:</span>
                  <div className="font-bold mt-1">
                    {selectedReq.requiredDeliveryDate ? new Date(selectedReq.requiredDeliveryDate).toLocaleDateString() : 'Immediate'}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-400 text-xs">Justification & Business Rationale:</span>
                <p className="text-sm bg-slate-900/30 p-2 rounded border border-slate-800 mt-1">
                  {selectedReq.justification || 'Standard scheduled inventory replenishment request.'}
                </p>
              </div>

              {selectedReq.rejectionReason && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-lg text-sm text-red-300">
                  <span className="font-bold flex items-center gap-1 mb-1">
                    <AlertTriangle size={14} /> Rejection Reason:
                  </span>
                  {selectedReq.rejectionReason}
                </div>
              )}

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-sm text-cyan-400 mb-2">Requested Products & Specifications</h4>
                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="table text-xs">
                    <thead>
                      <tr>
                        <th>Item Code</th>
                        <th>Product Description</th>
                        <th>Requested Qty</th>
                        <th>Est. Unit Price</th>
                        <th>Total</th>
                        <th>Pipeline Review</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReq.lines?.map((l) => (
                        <tr key={l.requisitionLineId}>
                          <td className="font-mono text-cyan-400">{l.item?.itemCode || 'ITM-01'}</td>
                          <td>
                            <div className="font-medium">{l.item?.itemName}</div>
                            {l.technicalSpecification && (
                              <div className="text-gray-400 text-[11px] mt-0.5">{l.technicalSpecification}</div>
                            )}
                          </td>
                          <td className="font-bold">{l.quantityRequested}</td>
                          <td className="font-mono">
                            {selectedReq.currency} {Number(l.estimatedUnitPrice).toLocaleString()}
                          </td>
                          <td className="font-mono font-bold text-cyan-400">
                            {selectedReq.currency} {(Number(l.quantityRequested) * Number(l.estimatedUnitPrice)).toLocaleString()}
                          </td>
                          <td>
                            <button
                              onClick={() => handleStockReview(l.itemId)}
                              className="btn btn-secondary btn-sm p-1 text-cyan-400 flex items-center gap-1"
                            >
                              <TrendingUp size={12} />
                              <span>Review Stock</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer flex items-center justify-between">
              <button onClick={() => setSelectedReq(null)} className="btn btn-secondary">
                Close
              </button>
              <div className="flex items-center gap-2">
                {selectedReq.status === 'APPROVED' && canManage && (
                  <button
                    onClick={() => setShowConvertModal(true)}
                    className="btn btn-primary flex items-center gap-1"
                    style={{ background: 'var(--accent-cyan)', color: '#000', fontWeight: 700 }}
                  >
                    <span>Generate Purchase Order</span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock & Pipeline Review */}
      {showStockReviewModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-cyan-400" size={20} />
                <h3 className="font-bold text-lg">Inventory Demand & Pipeline Review</h3>
              </div>
              <button onClick={() => setShowStockReviewModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {reviewLoading || !selectedItemReview ? (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
                  Calculating inventory safety thresholds...
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-xs text-gray-400">Product:</span>
                    <div className="text-base font-bold text-white">
                      {selectedItemReview.itemCode} - {selectedItemReview.itemName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Category: {selectedItemReview.category || 'Vehicle'} · Brand: {selectedItemReview.brand || 'Bajaj'}
                    </div>
                  </div>

                  {/* Stock Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <span className="text-xs text-gray-400">On-Hand Stock</span>
                      <div className="text-xl font-bold font-mono mt-1 text-emerald-400">
                        {selectedItemReview.stockOnHand}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <span className="text-xs text-gray-400">Reserved (Allotted)</span>
                      <div className="text-xl font-bold font-mono mt-1 text-amber-400">
                        {selectedItemReview.stockReserved}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <span className="text-xs text-gray-400">Available Stock</span>
                      <div className="text-xl font-bold font-mono mt-1 text-cyan-400">
                        {selectedItemReview.stockAvailable}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                      <span className="text-xs text-gray-400">Open PO Pipeline</span>
                      <div className="text-xl font-bold font-mono mt-1 text-blue-400">
                        {selectedItemReview.openPOQuantity}
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Recommendation */}
                  <div className="p-4 rounded-lg border border-cyan-900/60 bg-cyan-950/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                      <Info size={16} /> Replenishment & Safety Stock Intelligence
                    </div>
                    <div className="text-xs text-gray-300 space-y-1">
                      <div>
                        • Pending Requisitions in Pipeline: <span className="font-bold">{selectedItemReview.pendingRequisitionQuantity} units</span>
                      </div>
                      <div>
                        • Total Anticipated Inventory Supply: <span className="font-bold">{selectedItemReview.totalPipeline} units</span>
                      </div>
                      <div>
                        • Minimum Order Safety Buffer: <span className="font-bold">{selectedItemReview.safetyStockThreshold} units</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-cyan-900/40 text-xs">
                      {selectedItemReview.suggestedOrderQuantity > 0 ? (
                        <span className="text-amber-400 font-semibold">
                          Recommended Order Quantity: {selectedItemReview.suggestedOrderQuantity} unit(s) to meet minimum safety buffer.
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">
                          Inventory pipeline is healthy. Current stock and incoming POs meet the threshold.
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowStockReviewModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert Requisition to Purchase Order */}
      {showConvertModal && selectedReq && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '750px', width: '90%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <ArrowRight className="text-cyan-400" size={20} />
                <h3 className="font-bold text-lg">
                  Convert Requisition {selectedReq.requisitionNumber} to Purchase Order
                </h3>
              </div>
              <button onClick={() => setShowConvertModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConvertToPO}>
              <div className="modal-body space-y-4">
                <p className="text-sm text-gray-300">
                  This will generate an official Purchase Order in <span className="font-bold text-cyan-400">DRAFT</span> status with all requisition line items, contractual terms, and designated importer bank accounts.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Select Foreign Supplier / Manufacturer *</label>
                    <select
                      className="input w-full"
                      value={convertSupplierId}
                      onChange={(e) => setConvertSupplierId(Number(e.target.value) || '')}
                      required
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.supplierId} value={s.supplierId}>
                          {s.supplierName} ({s.country || 'Global'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Importer Bank Account *</label>
                    <select
                      className="input w-full"
                      value={convertBankAccountId}
                      onChange={(e) => setConvertBankAccountId(Number(e.target.value) || '')}
                      required
                    >
                      <option value="">Select Company Bank Account...</option>
                      {bankAccounts.map((b) => (
                        <option key={b.bankAccountId} value={b.bankAccountId}>
                          {b.bankName} - {b.accountName} ({b.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Incoterms *</label>
                    <select
                      className="input w-full text-xs"
                      value={convertIncoterms}
                      onChange={(e) => setConvertIncoterms(e.target.value)}
                      required
                    >
                      <option value="FOB">FOB - Free on Board</option>
                      <option value="CIF">CIF - Cost, Insurance & Freight</option>
                      <option value="CFR">CFR - Cost and Freight</option>
                      <option value="EXW">EXW - Ex Works</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Mode of Shipment *</label>
                    <select
                      className="input w-full text-xs"
                      value={convertModeShipment}
                      onChange={(e) => setConvertModeShipment(e.target.value)}
                      required
                    >
                      <option value="SEA">SEA Container</option>
                      <option value="AIR">AIR Cargo</option>
                      <option value="ROAD">ROAD Transport</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Port of Loading</label>
                    <input
                      type="text"
                      className="input w-full text-xs"
                      value={convertPortLoading}
                      onChange={(e) => setConvertPortLoading(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Agreed Commercial Payment Terms</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={convertPaymentTerms}
                    onChange={(e) => setConvertPaymentTerms(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowConvertModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Converting...' : 'Generate Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {showRejectModal && selectedReq && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="font-bold text-lg text-red-400">Reject Requisition</h3>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReject}>
              <div className="modal-body space-y-3">
                <p className="text-sm text-gray-300">
                  Please provide the management rejection reason for Requisition {selectedReq.requisitionNumber}.
                </p>
                <textarea
                  className="input w-full h-24"
                  placeholder="e.g. Current on-hand stock sufficient, or budget re-allocation needed..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ background: '#EF4444', color: '#fff' }}>
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
