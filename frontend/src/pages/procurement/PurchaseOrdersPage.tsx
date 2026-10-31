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
  Globe,
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

  const handleOpenPODetails = async (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setDetailTab('commercial');
    try {
      const full = await api.getPurchaseOrder(order.poId);
      setSelectedOrder(full);
    } catch (err) {
      console.error('Failed to fetch full PO details:', err);
    }
  };

  const handleTabChange = async (tab: 'commercial' | 'compliance' | 'payments' | 'lc') => {
    setDetailTab(tab);
    if (selectedOrder?.poId) {
      try {
        const full = await api.getPurchaseOrder(selectedOrder.poId);
        setSelectedOrder(full);
      } catch (err) {
        console.error('Error refreshing PO details on tab change:', err);
      }
    }
  };
  const [detailTab, setDetailTab] = useState<'commercial' | 'compliance' | 'payments' | 'lc'>('commercial');
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [poError, setPoError] = useState<string | null>(null);
  const [txnError, setTxnError] = useState<string | null>(null);

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
        paymentScheduleId: String(targetScheduleId),
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
      const msg = formatApiError(err, 'Failed to record payment transaction');
      setTxnError(msg);
      showToast('error', msg);
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

  // Computed metrics for KPI cards
  const confirmedOrders = orders.filter((o) => o.status === 'CONFIRMED');
  const draftOrders = orders.filter((o) => o.status === 'DRAFT');
  const submittedOrders = orders.filter((o) => o.status === 'SUBMITTED');
  const receivedOrders = orders.filter((o) => o.status === 'RECEIVED' || o.status === 'PARTIALLY_RECEIVED');
  const totalValueUSD = orders.reduce((sum, o) => {
    const val = (o.lines || []).reduce((lSum, l) => lSum + Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0), 0);
    return sum + val;
  }, 0);
  const confirmationRate = orders.length > 0 ? Math.round((confirmedOrders.length / orders.length) * 100) : 0;

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
        <span style={{ color: 'var(--text-secondary)' }}>Procurement Management</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Purchase Orders</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Purchase Orders & Commercial Execution
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Commercial terms, foreign currency remittance accounts, regulatory compliance, milestone payment schedules, and client-format PO documents
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {canCreatePO && (
            <button onClick={handleOpenCreateModal} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16} />
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL PURCHASE ORDERS
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{orders.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {confirmedOrders.length} Confirmed
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active execution contracts</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL COMMITTED VALUE
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={17} color="var(--accent-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-indigo)', letterSpacing: '-0.01em', marginTop: '0.25rem' }}>
            USD {totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            Across {orders.length} international procurement orders
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CONFIRMATION READINESS
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {confirmationRate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            {confirmedOrders.length} of {orders.length} orders confirmed & ready for shipping
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: '', label: `All Orders (${orders.length})` },
            { id: 'CONFIRMED', label: `Confirmed (${confirmedOrders.length})` },
            { id: 'DRAFT', label: `Draft (${draftOrders.length})` },
            { id: 'SUBMITTED', label: `Submitted (${submittedOrders.length})` },
            { id: 'RECEIVED', label: `Received (${receivedOrders.length})` },
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
            placeholder="Search by PO #, Supplier, Proforma Ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PO NUMBER</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPLIER & ORIGIN</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PO DATE</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>COMMERCIAL TERMS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ITEMS & UNITS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL VALUE</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                    <div>Loading purchase orders...</div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No purchase orders found matching your search.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((po) => {
                  const totalUnits = po.lines?.reduce((s, l) => s + Number(l.quantityOrdered || 0), 0) || 0;
                  const poTotal = po.lines?.reduce((s, l) => s + Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0), 0) || 0;
                  return (
                    <tr key={po.poId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '0.95rem' }} className="font-mono">
                          {po.poNumber}
                        </div>
                        {po.proformaInvoiceNo && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            PI: {po.proformaInvoiceNo}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          {po.supplier?.supplierName || 'Unknown Supplier'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          <Globe size={12} color="var(--accent-cyan)" />
                          <span>{po.supplier?.country || po.countryOfOrigin || 'International'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {new Date(po.poDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {po.incoterms || 'FOB'} · {po.modeOfShipment || 'SEA'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }} className="truncate max-w-xs">
                          {po.portOfLoading} → {po.portOfDischarge}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', fontSize: '0.825rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{po.lines?.length || 0} line(s)</span>
                        <span style={{ color: 'var(--text-muted)' }}> · {totalUnits} units</span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }} className="font-mono">
                        {po.currency} {poTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        {getStatusBadge(po.status)}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                          <button
                            onClick={() => handleOpenPODetails(po)}
                            className="btn btn-secondary btn-sm"
                            title="Manage PO Details & Import Features"
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            onClick={() => handleOpenPrintDocument(po.poId)}
                            className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--accent-cyan)' }}
                            title="Print Client-Format Purchase Order"
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
                              className="btn btn-success btn-sm"
                              style={{ background: '#10B981', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', border: '1px solid rgba(0, 210, 211, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>PO Ref:</span>
                    <span className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{selectedOrder.poNumber}</span>
                    <span style={{ marginLeft: '0.5rem' }}>{getStatusBadge(selectedOrder.status)}</span>
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Supplier: {selectedOrder.supplier?.supplierName || 'Unknown'} · Value: {selectedOrder.currency} {selectedOrder.lines?.reduce((s, l) => s + Number(l.quantityOrdered) * Number(l.unitPrice), 0).toLocaleString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => handleOpenPrintDocument(selectedOrder.poId)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Printer size={14} />
                  <span>Client-Format PO</span>
                </button>
                <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div style={{
              display: 'flex',
              gap: '0.6rem',
              padding: '0.85rem 1.25rem',
              background: 'rgba(15, 23, 42, 0.75)',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}>
              <button
                type="button"
                onClick={() => handleTabChange('commercial')}
                className={`filter-pill ${detailTab === 'commercial' ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  border: detailTab === 'commercial' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: detailTab === 'commercial' ? 'rgba(0, 210, 211, 0.15)' : 'var(--bg-tertiary)',
                  color: detailTab === 'commercial' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                <Package size={14} />
                <span>Lines & Commercial Terms</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('compliance')}
                className={`filter-pill ${detailTab === 'compliance' ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  border: detailTab === 'compliance' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: detailTab === 'compliance' ? 'rgba(0, 210, 211, 0.15)' : 'var(--bg-tertiary)',
                  color: detailTab === 'compliance' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                <ShieldCheck size={14} />
                <span>Regulatory Compliance ({selectedOrder.complianceRecords?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('payments')}
                className={`filter-pill ${detailTab === 'payments' ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  border: detailTab === 'payments' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: detailTab === 'payments' ? 'rgba(0, 210, 211, 0.15)' : 'var(--bg-tertiary)',
                  color: detailTab === 'payments' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                <CreditCard size={14} />
                <span>Payment Schedules ({selectedOrder.paymentSchedules?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('lc')}
                className={`filter-pill ${detailTab === 'lc' ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  cursor: 'pointer',
                  border: detailTab === 'lc' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: detailTab === 'lc' ? 'rgba(0, 210, 211, 0.15)' : 'var(--bg-tertiary)',
                  color: detailTab === 'lc' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease',
                }}
              >
                <FileCheck size={14} />
                <span>Letters of Credit ({selectedOrder.lettersOfCredit?.length || 0})</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* TAB 1: Commercial Terms & Lines */}
              {detailTab === 'commercial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Commercial Specifications Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.85rem',
                    padding: '1.15rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}>
                    {[
                      { label: 'Incoterms', val: selectedOrder.incoterms || 'FOB', color: 'var(--accent-cyan)' },
                      { label: 'Shipment Mode', val: selectedOrder.modeOfShipment || 'SEA', color: 'var(--text-primary)' },
                      { label: 'Port of Loading', val: selectedOrder.portOfLoading, color: 'var(--text-primary)' },
                      { label: 'Port of Discharge', val: selectedOrder.portOfDischarge, color: 'var(--text-primary)' },
                      { label: 'Payment Terms', val: selectedOrder.paymentTerms, color: 'var(--text-primary)' },
                      { label: 'Lead Time Days', val: `${selectedOrder.deliveryLeadTimeDays || 30} Days`, color: 'var(--text-primary)' },
                      { label: 'Expected Delivery', val: selectedOrder.expectedDeliveryDate || '30 days post-issuance', color: 'var(--text-primary)' },
                      { label: 'Importer Bank', val: selectedOrder.bankAccount?.bankName || 'CBE Forex', color: 'var(--accent-emerald)' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{item.label}</div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: item.color, marginTop: '0.2rem' }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Amount in words */}
                  {selectedOrder.amountInWords && (
                    <div style={{
                      padding: '0.85rem 1rem',
                      background: 'rgba(0, 210, 211, 0.08)',
                      border: '1px solid rgba(0, 210, 211, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.825rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>Amount in Words:</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontStyle: 'italic' }}>{selectedOrder.amountInWords}</span>
                    </div>
                  )}

                  {/* Line Items Table */}
                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SL.</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ITEM CODE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>DESCRIPTION OF GOODS</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HSN/SAC</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>QTY</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>UOM</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>UNIT RATE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LINE TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.lines?.map((l, idx) => (
                          <tr key={l.poLineId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.75rem 0.95rem' }}>{idx + 1}</td>
                            <td style={{ padding: '0.75rem 0.95rem' }} className="font-mono text-cyan-400">{l.item?.itemCode || `ITM-${l.itemId}`}</td>
                            <td style={{ padding: '0.75rem 0.95rem' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.itemDescription || l.item?.itemName}</div>
                            </td>
                            <td style={{ padding: '0.75rem 0.95rem' }} className="font-mono">{l.hsnSacCode || '8711.20'}</td>
                            <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{l.quantityOrdered}</td>
                            <td style={{ padding: '0.75rem 0.95rem' }}>{l.uom || 'PCS'}</td>
                            <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right' }} className="font-mono">{Number(l.unitPrice).toLocaleString()}</td>
                            <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">
                              {(Number(l.quantityOrdered) * Number(l.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Commercial Readiness Check Button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button
                      onClick={() => handleValidateReadiness(selectedOrder.poId)}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <ShieldCheck size={14} color="var(--accent-cyan)" />
                      <span>Verify Commercial Readiness</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Regulatory Compliance & Clearances (Phase 3) */}
              {detailTab === 'compliance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>Import Permits & Regulatory Clearances</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Tracks mandatory government permits, central bank approvals, and pre-shipment inspection certificates.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddComplianceModal(true)}
                      className="btn btn-cyan btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} />
                      <span>Add Requirement</span>
                    </button>
                  </div>

                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CLEARANCE TYPE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ISSUING AUTHORITY</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>APPLICATION REF</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>DOCUMENT REF</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXPIRY DATE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOGGLE STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.complianceRecords && selectedOrder.complianceRecords.length > 0 ? (
                          selectedOrder.complianceRecords.map((rec) => (
                            <tr key={rec.complianceRecordId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem 0.95rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{rec.requirementType}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{rec.issuingAuthority}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }} className="font-mono">{rec.applicationReference || 'Pending'}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }} className="font-mono">{rec.documentReference || 'Pending'}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{rec.expiryDate || 'N/A'}</td>
                              <td style={{ padding: '0.75rem 0.95rem', textAlign: 'center' }}>
                                {rec.status === 'APPROVED' ? (
                                  <span className="badge badge-success"><CheckCircle2 size={10} className="inline mr-1" /> APPROVED</span>
                                ) : (
                                  <span className="badge badge-warning"><Clock size={10} className="inline mr-1" /> {rec.status}</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right' }}>
                                <button
                                  onClick={() => handleToggleComplianceStatus(rec.complianceRecordId, rec.status)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                >
                                  {rec.status === 'APPROVED' ? 'Mark Pending' : 'Mark Approved'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>Contractual Payment Schedules & Milestones</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Tracks advance, document, and final payment milestones with live balance reconciliation.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddScheduleModal(true)}
                      className="btn btn-cyan btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MILESTONE NAME</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>METHOD</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>DUE DATE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>AMOUNT DUE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>AMOUNT PAID</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>REMAINING BALANCE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIONS</th>
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
                              <tr key={s.paymentScheduleId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '0.75rem 0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{s.milestoneName}</td>
                                <td style={{ padding: '0.75rem 0.95rem' }}>{s.paymentMethod}</td>
                                <td style={{ padding: '0.75rem 0.95rem' }}>{s.dueDate || 'Upon Event'}</td>
                                <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                                  {s.currency} {Number(s.amountDue).toLocaleString()}
                                </td>
                                <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', color: 'var(--accent-emerald)' }} className="font-mono">
                                  {s.currency} {totalPaid.toLocaleString()}
                                </td>
                                <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber)' }} className="font-mono">
                                  {s.currency} {remaining.toLocaleString()}
                                </td>
                                <td style={{ padding: '0.75rem 0.95rem', textAlign: 'center' }}>
                                  {remaining <= 0 ? (
                                    <span className="badge badge-success">PAID</span>
                                  ) : totalPaid > 0 ? (
                                    <span className="badge badge-info">PARTIAL</span>
                                  ) : (
                                    <span className="badge badge-warning">DUE</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right' }}>
                                  {remaining > 0 && (
                                    <button
                                      onClick={() => {
                                        setTargetScheduleId(s.paymentScheduleId);
                                        setTxnAmount(remaining);
                                        setShowRecordTxnModal(true);
                                      }}
                                      className="btn btn-cyan btn-sm"
                                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
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
                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: 0 }}>Letters of Credit (L/C) Portfolio</h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Tracks issued documentary credit obligations, advising banks, validity periods, and latest shipment deadlines.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddLCModal(true)}
                      className="btn btn-cyan btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Plus size={14} />
                      <span>Record L/C</span>
                    </button>
                  </div>

                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>L/C REFERENCE NUMBER</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ISSUING BANK</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ADVISING BANK</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>AMOUNT</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ISSUE DATE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>EXPIRY DATE</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LATEST SHIPMENT</th>
                          <th style={{ padding: '0.75rem 0.95rem', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.lettersOfCredit && selectedOrder.lettersOfCredit.length > 0 ? (
                          selectedOrder.lettersOfCredit.map((lc) => (
                            <tr key={lc.lcId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.75rem 0.95rem', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">{lc.lcNumber}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{lc.issuingBank}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{lc.advisingBank || 'N/A'}</td>
                              <td style={{ padding: '0.75rem 0.95rem', textAlign: 'right', fontWeight: 700 }} className="font-mono">
                                {lc.currency} {Number(lc.amount).toLocaleString()}
                              </td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{new Date(lc.issueDate).toLocaleDateString()}</td>
                              <td style={{ padding: '0.75rem 0.95rem', color: 'var(--accent-amber)', fontWeight: 600 }}>{new Date(lc.expiryDate).toLocaleDateString()}</td>
                              <td style={{ padding: '0.75rem 0.95rem' }}>{lc.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : 'N/A'}</td>
                              <td style={{ padding: '0.75rem 0.95rem', textAlign: 'center' }}>
                                <span className="badge badge-success">{lc.status}</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', border: '1px solid rgba(0, 210, 211, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {editingOrder ? `Edit Purchase Order ${editingOrder.poNumber}` : 'New Commercial Purchase Order'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Commercial import terms, foreign banking & allocation</span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePO}>
              <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {poError && <ModalErrorAlert error={poError} onDismiss={() => setPoError(null)} />}

                {/* Primary Supplier & Terms */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
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

                {/* Commercial Terms Section */}
                <div style={{
                  padding: '1.15rem',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Commercial & Logistics Specifications
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem' }}>
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
                <div style={{
                  padding: '1.15rem',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>Order Line Items</span>
                    <button type="button" onClick={handleAddLine} className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Plus size={14} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '0.65rem 0.85rem', width: '30%', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>PRODUCT *</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '12%', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HSN/SAC</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '15%', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>QTY *</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '10%', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>UOM</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '18%', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>UNIT PRICE ({currency}) *</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '15%', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>LINE TOTAL</th>
                          <th style={{ padding: '0.65rem 0.85rem', width: '5%' }}></th>
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
                <ModalErrorAlert error={txnError} />
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

      {/* Client-Format PO Document Preview & Print */}
      {showPrintModal && printData && (
        <ClientPODocumentModal data={printData} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
