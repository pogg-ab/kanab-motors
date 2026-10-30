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
  Printer,
  ShieldCheck,
  CreditCard,
  FileCheck,
  Calendar,
  Building2,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import {
  api,
  PurchaseOrder,
  Supplier,
  ProductItem,
  ExchangeRateDefault,
  CompanyBankAccount,
  ImportComplianceRecord,
  PoPaymentSchedule,
  PoLetterOfCredit,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';
import { ClientPODocumentModal } from '../../components/ClientPODocumentModal';

type PurchaseOrderFormLine = {
  itemId: string;
  quantityOrdered: number | string;
  unitPrice: number | string;
  hsnSacCode?: string;
  uom?: string;
  itemDescription?: string;
};

const normalizeWholeNumberInput = (value: string) => value.replace(/[^0-9]/g, '');
const normalizeDecimalInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [whole, ...decimalParts] = cleaned.split('.');
  return decimalParts.length > 0 ? `${whole}.${decimalParts.join('').slice(0, 2)}` : whole;
};

export const PurchaseOrdersPage: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const canCreatePO = hasPermission('PURCHASE_ORDERS_CREATE') || user?.role?.roleName === 'ADMIN';
  const canEditPO = hasPermission('PURCHASE_ORDERS_EDIT') || user?.role?.roleName === 'ADMIN';
  const canConfirmPO = hasPermission('PURCHASE_ORDERS_CONFIRM') || user?.role?.roleName === 'ADMIN';
  const canCancelPO = hasPermission('PURCHASE_ORDERS_CANCEL') || user?.role?.roleName === 'ADMIN';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateDefault[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals & Sub-views
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [detailTab, setDetailTab] = useState<'commercial' | 'compliance' | 'payments' | 'lc'>('commercial');
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [poError, setPoError] = useState<string | null>(null);

  // Client PO Document Print State (POX-05)
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [printData, setPrintData] = useState<any>(null);

  // Compliance Action Modal
  const [showAddComplianceModal, setShowAddComplianceModal] = useState<boolean>(false);
  const [complianceType, setComplianceType] = useState<string>('IMPORT_PERMIT');
  const [complianceAuthority, setComplianceAuthority] = useState<string>('Ministry of Trade and Regional Integration (MOTRI)');
  const [complianceAppRef, setComplianceAppRef] = useState<string>('');
  const [complianceDocRef, setComplianceDocRef] = useState<string>('');
  const [complianceExpiryDate, setComplianceExpiryDate] = useState<string>('');

  // Payment Schedule Action Modal
  const [showAddScheduleModal, setShowAddScheduleModal] = useState<boolean>(false);
  const [milestoneName, setMilestoneName] = useState<string>('Arrival & Clearance Milestone');
  const [milestoneMethod, setMilestoneMethod] = useState<string>('TELEGRAPHIC_TRANSFER');
  const [milestoneDueDate, setMilestoneDueDate] = useState<string>('');
  const [milestoneAmount, setMilestoneAmount] = useState<number | string>('');

  // Payment Transaction Action Modal
  const [showRecordTxnModal, setShowRecordTxnModal] = useState<boolean>(false);
  const [targetScheduleId, setTargetScheduleId] = useState<string>('');
  const [txnRef, setTxnRef] = useState<string>('');
  const [txnDate, setTxnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txnAmount, setTxnAmount] = useState<number | string>('');
  const [txnBank, setTxnBank] = useState<string>('Commercial Bank of Ethiopia');

  // Letter of Credit Action Modal
  const [showAddLCModal, setShowAddLCModal] = useState<boolean>(false);
  const [lcNumber, setLcNumber] = useState<string>('');
  const [lcIssuingBank, setLcIssuingBank] = useState<string>('Commercial Bank of Ethiopia');
  const [lcAdvisingBank, setLcAdvisingBank] = useState<string>('State Bank of India, Mumbai');
  const [lcAmount, setLcAmount] = useState<number | string>('');
  const [lcIssueDate, setLcIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [lcExpiryDate, setLcExpiryDate] = useState<string>('');
  const [lcLatestShipmentDate, setLcLatestShipmentDate] = useState<string>('');

  // Form State (PO Header & Commercials)
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [incoterms, setIncoterms] = useState<string>('FOB');
  const [paymentTerms, setPaymentTerms] = useState<string>('30% Advance T/T, 70% against Bill of Lading');
  const [countryOfOrigin, setCountryOfOrigin] = useState<string>('India');
  const [portOfLoading, setPortOfLoading] = useState<string>('Nhava Sheva (JNPT), Mumbai, India');
  const [portOfDischarge, setPortOfDischarge] = useState<string>('Djibouti Free Port / Mojo Dry Port');
  const [modeOfShipment, setModeOfShipment] = useState<string>('SEA');
  const [packingRequirements, setPackingRequirements] = useState<string>(
    'Standard export seaworthy packing in heavy-duty 40ft High Cube containers',
  );
  const [deliveryLeadTimeDays, setDeliveryLeadTimeDays] = useState<number | string>(30);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [proformaInvoiceNo, setProformaInvoiceNo] = useState<string>('');
  const [proformaInvoiceDate, setProformaInvoiceDate] = useState<string>('');
  const [bankAccountId, setBankAccountId] = useState<number | ''>('');
  const [lines, setLines] = useState<PurchaseOrderFormLine[]>([
    { itemId: '', quantityOrdered: 10, unitPrice: 2500, hsnSacCode: '8711.20', uom: 'PCS' },
  ]);

  const [saving, setSaving] = useState<boolean>(false);
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
      const [posRes, suppsData, prodsRes, rates, banksRes] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers('', true),
        api.getItems(),
        api.getExchangeRates(),
        api.getCompanyBankAccounts(),
      ]);
      setOrders(posRes.items || []);
      setSuppliers(suppsData);
      setProducts(prodsRes.items || []);
      setExchangeRates(rates || []);
      setBankAccounts(banksRes || []);
      if (banksRes && banksRes.length > 0 && !bankAccountId) {
        setBankAccountId(banksRes[0].bankAccountId);
      }
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load purchase orders'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPrintDocument = async (id: string) => {
    try {
      const docData = await api.getPOPrintData(id);
      setPrintData(docData);
      setShowPrintModal(true);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to fetch document layout'));
    }
  };

  const handleValidateReadiness = async (id: string) => {
    try {
      const result = await api.validatePOReadiness(id);
      showToast('success', result.messages.join(' '));
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Commercial readiness verification failed'));
    }
  };

  const resetForm = () => {
    setSupplierId('');
    setCurrency('USD');
    setPoDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIncoterms('FOB');
    setPaymentTerms('30% Advance T/T, 70% against Bill of Lading');
    setCountryOfOrigin('India');
    setPortOfLoading('Nhava Sheva (JNPT), Mumbai, India');
    setPortOfDischarge('Djibouti Free Port / Mojo Dry Port');
    setModeOfShipment('SEA');
    setPackingRequirements('Standard export seaworthy packing in heavy-duty 40ft High Cube containers');
    setDeliveryLeadTimeDays(30);
    setExpectedDeliveryDate('');
    setProformaInvoiceNo('');
    setProformaInvoiceDate('');
    if (bankAccounts.length > 0) setBankAccountId(bankAccounts[0].bankAccountId);
    setLines([{ itemId: '', quantityOrdered: 10, unitPrice: 2500, hsnSacCode: '8711.20', uom: 'PCS' }]);
    setPoError(null);
    setEditingOrder(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (po: PurchaseOrder) => {
    setEditingOrder(po);
    setSupplierId(po.supplierId);
    setCurrency(po.currency);
    setPoDate(po.poDate);
    setNotes(po.notes || '');
    setIncoterms(po.incoterms || 'FOB');
    setPaymentTerms(po.paymentTerms || '30% Advance T/T, 70% against Bill of Lading');
    setCountryOfOrigin(po.countryOfOrigin || 'India');
    setPortOfLoading(po.portOfLoading || 'Nhava Sheva (JNPT), Mumbai, India');
    setPortOfDischarge(po.portOfDischarge || 'Djibouti Free Port / Mojo Dry Port');
    setModeOfShipment(po.modeOfShipment || 'SEA');
    setPackingRequirements(po.packingRequirements || 'Standard export seaworthy packing');
    setDeliveryLeadTimeDays(po.deliveryLeadTimeDays || 30);
    setExpectedDeliveryDate(po.expectedDeliveryDate || '');
    setProformaInvoiceNo(po.proformaInvoiceNo || '');
    setProformaInvoiceDate(po.proformaInvoiceDate || '');
    setBankAccountId(po.bankAccountId || (bankAccounts[0]?.bankAccountId ?? ''));
    setLines(
      po.lines.map((l) => ({
        itemId: l.itemId,
        quantityOrdered: l.quantityOrdered,
        unitPrice: l.unitPrice,
        hsnSacCode: l.hsnSacCode || '8711.20',
        uom: l.uom || 'PCS',
        itemDescription: l.itemDescription,
      })),
    );
    setPoError(null);
    setShowCreateModal(true);
  };

  const handleAddLine = () => {
    setLines([
      ...lines,
      { itemId: '', quantityOrdered: 10, unitPrice: 0, hsnSacCode: '8711.20', uom: 'PCS' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      showToast('error', 'Purchase order must have at least one line item');
      return;
    }
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof PurchaseOrderFormLine, val: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: val };
    if (field === 'itemId') {
      const prod = products.find((p) => p.itemId === val);
      if (prod && !updated[index].unitPrice) {
        updated[index].unitPrice = Number(prod.sellingPrice) > 0 ? Number(prod.sellingPrice) : 2500;
      }
    }
    setLines(updated);
  };

  const calculateTotal = () => {
    return lines.reduce((acc, l) => acc + Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0), 0);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoError(null);

    if (!supplierId) {
      setPoError('Please select a supplier');
      return;
    }

    for (const l of lines) {
      if (!l.itemId) {
        setPoError('Please select an item for each line');
        return;
      }
      if (Number(l.quantityOrdered) < 1) {
        setPoError('Quantity ordered must be at least 1');
        return;
      }
      if (Number(l.unitPrice) <= 0) {
        setPoError('Unit price must be greater than 0');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: Number(supplierId),
        currency,
        poDate,
        notes: notes.trim(),
        incoterms,
        paymentTerms,
        countryOfOrigin,
        portOfLoading,
        portOfDischarge,
        modeOfShipment,
        packingRequirements,
        deliveryLeadTimeDays: Number(deliveryLeadTimeDays) || 30,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        proformaInvoiceNo: proformaInvoiceNo.trim() || undefined,
        proformaInvoiceDate: proformaInvoiceDate || undefined,
        bankAccountId: bankAccountId ? Number(bankAccountId) : undefined,
        lines: lines.map((l) => ({
          itemId: l.itemId,
          quantityOrdered: Number(l.quantityOrdered),
          unitPrice: Number(l.unitPrice),
          hsnSacCode: l.hsnSacCode || '8711.20',
          uom: l.uom || 'PCS',
          itemDescription: l.itemDescription?.trim(),
        })),
        userId: user?.userId || 1,
      };

      if (editingOrder) {
        await api.updatePurchaseOrder(editingOrder.poId, payload);
        showToast('success', `Purchase Order ${editingOrder.poNumber} updated successfully`);
      } else {
        const created = await api.createPurchaseOrder(payload);
        showToast('success', `Purchase Order ${created.poNumber} created in DRAFT status`);
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      setPoError(formatApiError(err, 'Failed to save purchase order'));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const updated = await api.updatePurchaseOrderStatus(id, status, user?.userId);
      showToast('success', `Purchase Order ${updated.poNumber} status updated to ${status}`);
      loadData();
      if (selectedOrder?.poId === id) {
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update PO status'));
    }
  };

  // Compliance Handlers
  const handleAddCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.createPOComplianceRecord(selectedOrder.poId, {
        requirementType: complianceType,
        issuingAuthority: complianceAuthority,
        applicationReference: complianceAppRef.trim() || undefined,
        documentReference: complianceDocRef.trim() || undefined,
        expiryDate: complianceExpiryDate || undefined,
        status: 'PENDING',
        userId: user?.userId,
      });
      showToast('success', 'Regulatory compliance requirement added');
      setShowAddComplianceModal(false);
      // Reload single PO
      const refreshed = await api.getPurchaseOrder(selectedOrder.poId);
      setSelectedOrder(refreshed);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to add compliance record'));
    }
  };

  const handleToggleComplianceStatus = async (recordId: string, currentStatus: string) => {
    if (!selectedOrder) return;
    const nextStatus = currentStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
    try {
      await api.updatePOComplianceStatus(recordId, nextStatus, 'Status verified by compliance team');
      const refreshed = await api.getPurchaseOrder(selectedOrder.poId);
      setSelectedOrder(refreshed);
      showToast('success', `Compliance status updated to ${nextStatus}`);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update compliance record status'));
    }
  };

  // Payment Schedule Handlers
  const handleAddPaymentSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !milestoneAmount) return;
    try {
      await api.createPOPaymentSchedule(selectedOrder.poId, {
        milestoneName: milestoneName.trim(),
        paymentMethod: milestoneMethod,
        dueDate: milestoneDueDate || undefined,
        amountDue: Number(milestoneAmount),
        currency: selectedOrder.currency,
        userId: user?.userId,
      });
      showToast('success', 'Payment milestone added to schedule');
      setShowAddScheduleModal(false);
      setMilestoneAmount('');
      const refreshed = await api.getPurchaseOrder(selectedOrder.poId);
      setSelectedOrder(refreshed);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to add payment milestone'));
    }
  };

  const handleRecordPaymentTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !targetScheduleId || !txnAmount) return;
    try {
      await api.recordPOPaymentTransaction({
        paymentScheduleId: targetScheduleId,
        paymentReference: txnRef.trim(),
        paymentDate: txnDate,
        amountPaid: Number(txnAmount),
        currency: selectedOrder.currency,
        bankName: txnBank.trim(),
        userId: user?.userId,
      });
      showToast('success', 'Payment transaction confirmed and balance recalculated');
      setShowRecordTxnModal(false);
      setTxnAmount('');
      setTxnRef('');
      const refreshed = await api.getPurchaseOrder(selectedOrder.poId);
      setSelectedOrder(refreshed);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to record payment transaction'));
    }
  };

  // Letter of Credit Handlers
  const handleAddLC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !lcNumber || !lcAmount || !lcExpiryDate) {
      showToast('error', 'Please fill in all mandatory L/C fields');
      return;
    }
    try {
      await api.createPOLetterOfCredit(selectedOrder.poId, {
        lcNumber: lcNumber.trim(),
        issuingBank: lcIssuingBank.trim(),
        advisingBank: lcAdvisingBank.trim(),
        amount: Number(lcAmount),
        currency: selectedOrder.currency,
        issueDate: lcIssueDate,
        expiryDate: lcExpiryDate,
        latestShipmentDate: lcLatestShipmentDate || undefined,
        userId: user?.userId,
      });
      showToast('success', `Letter of Credit ${lcNumber} recorded successfully`);
      setShowAddLCModal(false);
      setLcNumber('');
      setLcAmount('');
      const refreshed = await api.getPurchaseOrder(selectedOrder.poId);
      setSelectedOrder(refreshed);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to record Letter of Credit'));
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      (o.supplier?.supplierName || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.proformaInvoiceNo || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <span className="badge badge-secondary">DRAFT</span>;
      case 'SUBMITTED':
        return <span className="badge badge-warning"><Clock size={12} className="inline mr-1" /> SUBMITTED</span>;
      case 'CONFIRMED':
        return <span className="badge badge-success"><CheckCircle2 size={12} className="inline mr-1" /> CONFIRMED</span>;
      case 'PARTIALLY_RECEIVED':
        return <span className="badge badge-info">PARTIAL</span>;
      case 'RECEIVED':
        return <span className="badge badge-success">RECEIVED</span>;
      case 'CANCELLED':
        return <span className="badge badge-danger">CANCELLED</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
          borderLeft: '4px solid var(--accent-cyan)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge" style={{ background: 'var(--accent-cyan)', color: '#000', fontWeight: 700 }}>
                KMSICAMS-12 Phase 2-4
              </span>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Purchase Orders & Commercial Import Execution
              </h2>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Commercial terms, IEC & bank configurations, regulatory compliance checklists, milestone payment schedules, and official PO document printing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="btn btn-secondary" disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            {canCreatePO && (
              <button onClick={handleOpenCreateModal} className="btn btn-primary">
                <Plus size={16} />
                <span>New Purchase Order</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by PO #, Supplier, Proforma Ref, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ minWidth: '180px' }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier & Country</th>
                <th>PO Date</th>
                <th>Commercial Terms</th>
                <th>Items & Units</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-cyan-400" />
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10" style={{ color: 'var(--text-secondary)' }}>
                    No purchase orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const totalUnits = po.lines?.reduce((s, l) => s + Number(l.quantityOrdered || 0), 0) || 0;
                  const poTotal = po.lines?.reduce((s, l) => s + Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0), 0) || 0;
                  return (
                    <tr key={po.poId} className="hover:bg-slate-800/20">
                      <td className="font-mono font-semibold" style={{ color: 'var(--accent-cyan)' }}>
                        {po.poNumber}
                        {po.proformaInvoiceNo && (
                          <div className="text-[11px] text-gray-400 font-sans">PI: {po.proformaInvoiceNo}</div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium">{po.supplier?.supplierName || 'Unknown Supplier'}</div>
                        <div className="text-xs text-gray-400">{po.supplier?.country || po.countryOfOrigin || 'India'}</div>
                      </td>
                      <td>{new Date(po.poDate).toLocaleDateString()}</td>
                      <td className="text-xs">
                        <div className="font-semibold text-cyan-300">{po.incoterms || 'FOB'} · {po.modeOfShipment || 'SEA'}</div>
                        <div className="text-gray-400 truncate max-w-xs">{po.portOfLoading} → {po.portOfDischarge}</div>
                      </td>
                      <td>
                        <div className="text-sm">
                          {po.lines?.length || 0} line(s) · <span className="font-bold">{totalUnits}</span> units
                        </div>
                      </td>
                      <td className="font-mono font-bold">
                        {po.currency} {poTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>{getStatusBadge(po.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedOrder(po);
                              setDetailTab('commercial');
                            }}
                            className="btn btn-secondary btn-sm"
                            title="Manage PO Details & Import Features"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenPrintDocument(po.poId)}
                            className="btn btn-secondary btn-sm text-cyan-400"
                            title="Print Client-Format PO Document (POX-05)"
                          >
                            <Printer size={14} />
                          </button>

                          {po.status === 'DRAFT' && canEditPO && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(po)}
                                className="btn btn-secondary btn-sm"
                                title="Edit PO"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(po.poId, 'SUBMITTED')}
                                className="btn btn-primary btn-sm"
                                title="Submit PO"
                              >
                                <Send size={14} />
                              </button>
                            </>
                          )}

                          {po.status === 'SUBMITTED' && canConfirmPO && (
                            <button
                              onClick={() => handleUpdateStatus(po.poId, 'CONFIRMED')}
                              className="btn btn-success btn-sm flex items-center gap-1"
                              style={{ background: '#10B981', color: '#fff' }}
                              title="Confirm & Authorize PO"
                            >
                              <Check size={14} />
                              <span>Confirm</span>
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

      {/* PO Detail & Full Import Processes Modal */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '1000px', width: '95%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <FileText className="text-cyan-400" size={22} />
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <span>PO Ref:</span>
                    <span className="font-mono text-cyan-400">{selectedOrder.poNumber}</span>
                    <span className="ml-2">{getStatusBadge(selectedOrder.status)}</span>
                  </h3>
                  <span className="text-xs text-gray-400">
                    Supplier: {selectedOrder.supplier?.supplierName} · Value: {selectedOrder.currency} {selectedOrder.lines?.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitPrice), 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPrintDocument(selectedOrder.poId)}
                  className="btn btn-secondary btn-sm flex items-center gap-1 text-cyan-400"
                >
                  <Printer size={14} />
                  <span>Client-Format PO</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary btn-sm">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex border-b border-slate-700 px-4 bg-slate-900/60 text-xs font-semibold">
              <button
                onClick={() => setDetailTab('commercial')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'commercial' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Package size={14} />
                <span>Lines & Commercial Terms</span>
              </button>
              <button
                onClick={() => setDetailTab('compliance')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'compliance' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <ShieldCheck size={14} />
                <span>Regulatory Compliance ({selectedOrder.complianceRecords?.length || 0})</span>
              </button>
              <button
                onClick={() => setDetailTab('payments')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'payments' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <CreditCard size={14} />
                <span>Payment Schedules ({selectedOrder.paymentSchedules?.length || 0})</span>
              </button>
              <button
                onClick={() => setDetailTab('lc')}
                className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors ${
                  detailTab === 'lc' ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileCheck size={14} />
                <span>Letters of Credit (L/C) ({selectedOrder.lettersOfCredit?.length || 0})</span>
              </button>
            </div>

            <div className="modal-body space-y-4 max-h-[70vh] overflow-y-auto">
              {/* TAB 1: Commercial Terms & Lines */}
              {detailTab === 'commercial' && (
                <div className="space-y-4">
                  {/* Commercial Specifications Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                    <div>
                      <span className="text-gray-400">Incoterms:</span>
                      <div className="font-bold text-cyan-300 mt-0.5">{selectedOrder.incoterms || 'FOB'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Shipment Mode:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.modeOfShipment || 'SEA'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Port of Loading:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.portOfLoading}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Port of Discharge:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.portOfDischarge}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Payment Terms:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.paymentTerms}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Lead Time Days:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.deliveryLeadTimeDays || 30} Days</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Expected Delivery:</span>
                      <div className="font-bold text-white mt-0.5">{selectedOrder.expectedDeliveryDate || '30 days post-issuance'}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Importer Bank:</span>
                      <div className="font-bold text-cyan-300 mt-0.5">{selectedOrder.bankAccount?.bankName || 'CBE Forex'}</div>
                    </div>
                  </div>

                  {/* Amount in words */}
                  {selectedOrder.amountInWords && (
                    <div className="p-2.5 bg-cyan-950/20 border border-cyan-900/50 rounded-lg text-xs">
                      <span className="font-bold text-cyan-300">Amount in Words: </span>
                      <span className="font-semibold text-white">{selectedOrder.amountInWords}</span>
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>Sl.</th>
                          <th>Item Code</th>
                          <th>Description of Goods</th>
                          <th>HSN/SAC</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th>UOM</th>
                          <th style={{ textAlign: 'right' }}>Unit Rate</th>
                          <th style={{ textAlign: 'right' }}>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.lines?.map((l, idx) => (
                          <tr key={l.poLineId}>
                            <td>{idx + 1}</td>
                            <td className="font-mono text-cyan-400">{l.item?.itemCode || `ITM-${l.itemId}`}</td>
                            <td>
                              <div className="font-medium">{l.itemDescription || l.item?.itemName}</div>
                            </td>
                            <td className="font-mono">{l.hsnSacCode || '8711.20'}</td>
                            <td className="font-bold text-right">{l.quantityOrdered}</td>
                            <td>{l.uom || 'PCS'}</td>
                            <td className="font-mono text-right">{Number(l.unitPrice).toLocaleString()}</td>
                            <td className="font-mono font-bold text-right text-cyan-400">
                              {(Number(l.quantityOrdered) * Number(l.unitPrice)).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commercial Readiness Check Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => handleValidateReadiness(selectedOrder.poId)}
                      className="btn btn-secondary btn-sm flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} className="text-cyan-400" />
                      <span>Verify Commercial Readiness (IMP-11)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Regulatory Compliance & Clearances (Phase 3) */}
              {detailTab === 'compliance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-cyan-400">Import Permits & Regulatory Clearances (IMP-12)</h4>
                      <p className="text-xs text-gray-400">
                        Tracks mandatory government permits, central bank approvals, and pre-shipment inspection certificates.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddComplianceModal(true)}
                      className="btn btn-primary btn-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Add Requirement</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>Clearance Type</th>
                          <th>Issuing Authority</th>
                          <th>Application Ref</th>
                          <th>Document Ref</th>
                          <th>Expiry Date</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Toggle Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.complianceRecords && selectedOrder.complianceRecords.length > 0 ? (
                          selectedOrder.complianceRecords.map((rec) => (
                            <tr key={rec.complianceRecordId}>
                              <td className="font-semibold text-cyan-300">{rec.requirementType}</td>
                              <td>{rec.issuingAuthority}</td>
                              <td className="font-mono">{rec.applicationReference || 'Pending'}</td>
                              <td className="font-mono">{rec.documentReference || 'Pending'}</td>
                              <td>{rec.expiryDate || 'N/A'}</td>
                              <td>
                                {rec.status === 'APPROVED' ? (
                                  <span className="badge badge-success"><CheckCircle2 size={10} className="inline mr-1" /> APPROVED</span>
                                ) : (
                                  <span className="badge badge-warning"><Clock size={10} className="inline mr-1" /> {rec.status}</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button
                                  onClick={() => handleToggleComplianceStatus(rec.complianceRecordId, rec.status)}
                                  className="btn btn-secondary btn-sm text-[11px]"
                                >
                                  {rec.status === 'APPROVED' ? 'Mark Pending' : 'Mark Approved'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-gray-400">
                              No regulatory compliance records tracked for this PO yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: Payment Schedules & Milestones (Phase 4) */}
              {detailTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-cyan-400">Contractual Payment Schedules & Milestones (IMP-16)</h4>
                      <p className="text-xs text-gray-400">
                        Tracks advance, document, and final payment milestones with live balance reconciliation.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddScheduleModal(true)}
                      className="btn btn-primary btn-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>Milestone Name</th>
                          <th>Method</th>
                          <th>Due Date</th>
                          <th>Amount Due</th>
                          <th>Amount Paid</th>
                          <th>Remaining Balance</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.paymentSchedules && selectedOrder.paymentSchedules.length > 0 ? (
                          selectedOrder.paymentSchedules.map((s) => {
                            const totalPaid = s.transactions
                              ?.filter((t) => t.status === 'CONFIRMED')
                              .reduce((acc, t) => acc + Number(t.amountPaid), 0) || 0;
                            const remaining = Math.max(0, Number(s.amountDue) - totalPaid);
                            return (
                              <tr key={s.paymentScheduleId}>
                                <td className="font-semibold text-white">{s.milestoneName}</td>
                                <td>{s.paymentMethod}</td>
                                <td>{s.dueDate || 'Upon Event'}</td>
                                <td className="font-mono font-bold">
                                  {s.currency} {Number(s.amountDue).toLocaleString()}
                                </td>
                                <td className="font-mono text-emerald-400">
                                  {s.currency} {totalPaid.toLocaleString()}
                                </td>
                                <td className="font-mono font-bold text-amber-400">
                                  {s.currency} {remaining.toLocaleString()}
                                </td>
                                <td>
                                  {remaining <= 0 ? (
                                    <span className="badge badge-success">PAID</span>
                                  ) : totalPaid > 0 ? (
                                    <span className="badge badge-info">PARTIAL</span>
                                  ) : (
                                    <span className="badge badge-warning">DUE</span>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {remaining > 0 && (
                                    <button
                                      onClick={() => {
                                        setTargetScheduleId(s.paymentScheduleId);
                                        setTxnAmount(remaining);
                                        setShowRecordTxnModal(true);
                                      }}
                                      className="btn btn-primary btn-sm text-[11px]"
                                      style={{ background: 'var(--accent-cyan)', color: '#000', fontWeight: 600 }}
                                    >
                                      Record Payment
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-gray-400">
                              No payment milestones created yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: Letter of Credit Tracking (Phase 4) */}
              {detailTab === 'lc' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-cyan-400">Letter of Credit (L/C) Tracking (IMP-20)</h4>
                      <p className="text-xs text-gray-400">
                        Tracks issued documentary credit obligations, advising banks, validity periods, and latest shipment deadlines.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddLCModal(true)}
                      className="btn btn-primary btn-sm flex items-center gap-1"
                    >
                      <Plus size={14} />
                      <span>Record L/C</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="table text-xs">
                      <thead>
                        <tr>
                          <th>L/C Reference Number</th>
                          <th>Issuing Bank</th>
                          <th>Advising Bank</th>
                          <th>Amount</th>
                          <th>Issue Date</th>
                          <th>Expiry Date</th>
                          <th>Latest Shipment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.lettersOfCredit && selectedOrder.lettersOfCredit.length > 0 ? (
                          selectedOrder.lettersOfCredit.map((lc) => (
                            <tr key={lc.lcId}>
                              <td className="font-mono font-bold text-cyan-400">{lc.lcNumber}</td>
                              <td>{lc.issuingBank}</td>
                              <td>{lc.advisingBank || 'N/A'}</td>
                              <td className="font-mono font-bold">
                                {lc.currency} {Number(lc.amount).toLocaleString()}
                              </td>
                              <td>{new Date(lc.issueDate).toLocaleDateString()}</td>
                              <td className="text-amber-400 font-semibold">{new Date(lc.expiryDate).toLocaleDateString()}</td>
                              <td>{lc.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : 'N/A'}</td>
                              <td>
                                <span className="badge badge-success">{lc.status}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="text-center py-6 text-gray-400">
                              No Letters of Credit recorded for this Purchase Order.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer flex items-center justify-between">
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit PO Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '950px', width: '95%' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <FileText className="text-cyan-400" size={20} />
                <h3 className="font-bold text-lg">
                  {editingOrder ? `Edit Purchase Order ${editingOrder.poNumber}` : 'New Commercial Purchase Order'}
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePO}>
              <div className="modal-body space-y-4 max-h-[75vh] overflow-y-auto">
                {poError && <ModalErrorAlert error={poError} onDismiss={() => setPoError(null)} />}

                {/* Primary Supplier & Terms */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Foreign Supplier / Vendor *</label>
                    <select
                      className="input w-full"
                      value={supplierId}
                      onChange={(e) => setSupplierId(Number(e.target.value) || '')}
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
                    <label className="form-label">Order Currency *</label>
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
                    <label className="form-label">PO Date *</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Commercial Terms Section (Phase 2 - IMP-07 to IMP-10) */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-3">
                  <span className="font-bold text-xs text-cyan-400 uppercase tracking-wider">
                    Commercial & Logistics Terms
                  </span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="form-label">Incoterms *</label>
                      <select
                        className="input w-full text-xs"
                        value={incoterms}
                        onChange={(e) => setIncoterms(e.target.value)}
                        required
                      >
                        <option value="FOB">FOB - Free on Board</option>
                        <option value="CIF">CIF - Cost, Insurance & Freight</option>
                        <option value="CFR">CFR - Cost and Freight</option>
                        <option value="EXW">EXW - Ex Works</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Shipment Mode *</label>
                      <select
                        className="input w-full text-xs"
                        value={modeOfShipment}
                        onChange={(e) => setModeOfShipment(e.target.value)}
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
                        value={portOfLoading}
                        onChange={(e) => setPortOfLoading(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Port of Discharge</label>
                      <input
                        type="text"
                        className="input w-full text-xs"
                        value={portOfDischarge}
                        onChange={(e) => setPortOfDischarge(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="form-label">Payment Terms Agreement</label>
                      <input
                        type="text"
                        className="input w-full text-xs"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Delivery Lead Time (Days)</label>
                      <input
                        type="number"
                        min="1"
                        className="input w-full text-xs"
                        value={deliveryLeadTimeDays}
                        onChange={(e) => setDeliveryLeadTimeDays(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Designated Importer Bank Account</label>
                      <select
                        className="input w-full text-xs"
                        value={bankAccountId}
                        onChange={(e) => setBankAccountId(Number(e.target.value) || '')}
                      >
                        <option value="">Select Bank Account...</option>
                        {bankAccounts.map((b) => (
                          <option key={b.bankAccountId} value={b.bankAccountId}>
                            {b.bankName} - {b.accountName} ({b.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-700 rounded-lg p-3 bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-cyan-400">Order Line Items</span>
                    <button type="button" onClick={handleAddLine} className="btn btn-secondary btn-sm flex items-center gap-1">
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table text-sm">
                      <thead>
                        <tr>
                          <th style={{ width: '30%' }}>Product *</th>
                          <th style={{ width: '12%' }}>HSN/SAC</th>
                          <th style={{ width: '15%' }}>Qty *</th>
                          <th style={{ width: '10%' }}>UOM</th>
                          <th style={{ width: '18%' }}>Unit Price ({currency}) *</th>
                          <th style={{ width: '15%' }}>Line Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((l, idx) => {
                          const total = Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0);
                          return (
                            <tr key={idx}>
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
                                      {p.itemCode} - {p.itemName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="input w-full text-xs font-mono"
                                  value={l.hsnSacCode || '8711.20'}
                                  onChange={(e) => handleLineChange(idx, 'hsnSacCode', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  className="input w-full text-xs"
                                  value={l.quantityOrdered}
                                  onChange={(e) => handleLineChange(idx, 'quantityOrdered', e.target.value)}
                                  required
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="input w-full text-xs"
                                  value={l.uom || 'PCS'}
                                  onChange={(e) => handleLineChange(idx, 'uom', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  className="input w-full text-xs font-mono"
                                  value={l.unitPrice}
                                  onChange={(e) => handleLineChange(idx, 'unitPrice', e.target.value)}
                                  required
                                />
                              </td>
                              <td className="font-mono font-bold text-xs">
                                {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLine(idx)}
                                  className="btn btn-danger btn-sm p-1"
                                  title="Remove Line"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end items-center pt-2 border-t border-slate-700 text-sm font-bold">
                    <span className="text-gray-400 mr-2">Grand Total:</span>
                    <span className="text-cyan-400 font-mono text-base">
                      {currency} {calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingOrder ? 'Save Changes' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Compliance Modal */}
      {showAddComplianceModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="font-bold text-base text-cyan-400">Add Regulatory Compliance Requirement</h3>
              <button onClick={() => setShowAddComplianceModal(false)} className="btn btn-secondary btn-sm">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleAddCompliance}>
              <div className="modal-body space-y-3 text-xs">
                <div>
                  <label className="form-label">Clearance / Permit Type *</label>
                  <select
                    className="input w-full"
                    value={complianceType}
                    onChange={(e) => setComplianceType(e.target.value)}
                    required
                  >
                    <option value="IMPORT_PERMIT">Import Permit</option>
                    <option value="CENTRAL_BANK_APPROVAL">National Bank FX Approval</option>
                    <option value="PRE_SHIPMENT_INSPECTION_CERT">Pre-Shipment Inspection Certificate</option>
                    <option value="CUSTOMS_CLEARANCE">Customs Transit Clearance</option>
                    <option value="RADIATION_CLEARANCE">Radiation & Standards Clearance</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Issuing Authority *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={complianceAuthority}
                    onChange={(e) => setComplianceAuthority(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Application Reference #</label>
                  <input
                    type="text"
                    className="input w-full font-mono"
                    placeholder="e.g. MOTRI-APP-88492"
                    value={complianceAppRef}
                    onChange={(e) => setComplianceAppRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Document Reference #</label>
                  <input
                    type="text"
                    className="input w-full font-mono"
                    placeholder="e.g. DOC-CERT-99214"
                    value={complianceDocRef}
                    onChange={(e) => setComplianceDocRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={complianceExpiryDate}
                    onChange={(e) => setComplianceExpiryDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowAddComplianceModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Requirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Milestone Modal */}
      {showAddScheduleModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="font-bold text-base text-cyan-400">Add Payment Schedule Milestone</h3>
              <button onClick={() => setShowAddScheduleModal(false)} className="btn btn-secondary btn-sm">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleAddPaymentSchedule}>
              <div className="modal-body space-y-3 text-xs">
                <div>
                  <label className="form-label">Milestone Name *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={milestoneName}
                    onChange={(e) => setMilestoneName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Payment Method *</label>
                  <select
                    className="input w-full"
                    value={milestoneMethod}
                    onChange={(e) => setMilestoneMethod(e.target.value)}
                    required
                  >
                    <option value="TELEGRAPHIC_TRANSFER">Telegraphic Transfer (T/T)</option>
                    <option value="LETTER_OF_CREDIT">Letter of Credit (L/C)</option>
                    <option value="CASH_AGAINST_DOCUMENTS">Cash Against Documents (CAD)</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Amount Due ({selectedOrder?.currency}) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input w-full font-mono"
                    value={milestoneAmount}
                    onChange={(e) => setMilestoneAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={milestoneDueDate}
                    onChange={(e) => setMilestoneDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowAddScheduleModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Transaction Modal */}
      {showRecordTxnModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="font-bold text-base text-cyan-400">Record Payment Transaction</h3>
              <button onClick={() => setShowRecordTxnModal(false)} className="btn btn-secondary btn-sm">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleRecordPaymentTxn}>
              <div className="modal-body space-y-3 text-xs">
                <div>
                  <label className="form-label">Bank Reference / SWIFT MT103 Ref *</label>
                  <input
                    type="text"
                    className="input w-full font-mono"
                    placeholder="e.g. SWIFT-FT-2024-009284"
                    value={txnRef}
                    onChange={(e) => setTxnRef(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Remitting Bank Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={txnBank}
                    onChange={(e) => setTxnBank(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Payment Date *</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Amount Paid ({selectedOrder?.currency}) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input w-full font-mono font-bold"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowRecordTxnModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#10B981', color: '#fff' }}>
                  Confirm Payment & Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Letter of Credit Modal */}
      {showAddLCModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '550px', width: '90%' }}>
            <div className="modal-header">
              <h3 className="font-bold text-base text-cyan-400">Issue & Track Letter of Credit (L/C)</h3>
              <button onClick={() => setShowAddLCModal(false)} className="btn btn-secondary btn-sm">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleAddLC}>
              <div className="modal-body space-y-3 text-xs">
                <div>
                  <label className="form-label">L/C Reference Number *</label>
                  <input
                    type="text"
                    className="input w-full font-mono font-bold"
                    placeholder="e.g. LC-2024-CBE-99482"
                    value={lcNumber}
                    onChange={(e) => setLcNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Issuing Bank *</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={lcIssuingBank}
                      onChange={(e) => setLcIssuingBank(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Advising / Nominated Bank</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={lcAdvisingBank}
                      onChange={(e) => setLcAdvisingBank(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">L/C Amount ({selectedOrder?.currency}) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input w-full font-mono font-bold"
                    value={lcAmount}
                    onChange={(e) => setLcAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Issue Date *</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={lcIssueDate}
                      onChange={(e) => setLcIssueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Expiry Date *</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={lcExpiryDate}
                      onChange={(e) => setLcExpiryDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Latest Shipment Date</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={lcLatestShipmentDate}
                      onChange={(e) => setLcLatestShipmentDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer flex items-center justify-between">
                <button type="button" onClick={() => setShowAddLCModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Letter of Credit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client-Format PO Document Preview & Print Modal (POX-05) */}
      {showPrintModal && printData && (
        <ClientPODocumentModal data={printData} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
