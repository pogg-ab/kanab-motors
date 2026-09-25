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
} from 'lucide-react';
import {
  api,
  PurchaseOrder,
  Supplier,
  ProductItem,
  ExchangeRateDefault,
} from '../../api/client';

export const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateDefault[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  // Form State
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'ETB'>('USD');
  const [poDate, setPoDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<
    { itemId: string; quantityOrdered: number; unitPrice: number }[]
  >([{ itemId: '', quantityOrdered: 1, unitPrice: 0 }]);

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
      const [posRes, suppsData, prodsRes, rates] = await Promise.all([
        api.getPurchaseOrders(),
        api.getSuppliers('', true),
        api.getItems(),
        api.getExchangeRates(),
      ]);
      setOrders(posRes.items || []);
      setSuppliers(suppsData);
      setProducts(prodsRes.items || []);
      setExchangeRates(rates || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { itemId: '', quantityOrdered: 1, unitPrice: 0 }]);
  };

  const getRateToEtb = (curr: 'USD' | 'EUR' | 'ETB') => {
    if (curr === 'ETB') return 1;
    return Number(exchangeRates.find((r) => r.currency === curr)?.rateToEtb || 0);
  };

  const suggestUnitPrice = (product: ProductItem, curr: 'USD' | 'EUR' | 'ETB') => {
    const sellingPriceEtb = Number(product.sellingPrice || 0);
    const rate = getRateToEtb(curr);
    if (curr === 'ETB') return Math.round(sellingPriceEtb * 100) / 100;
    if (!rate || rate <= 0) return 0;
    return Math.round((sellingPriceEtb / rate) * 100) / 100;
  };

  const handleCurrencyChange = (nextCurrency: 'USD' | 'EUR' | 'ETB') => {
    setCurrency(nextCurrency);
    setLines((currentLines) =>
      currentLines.map((line) => {
        const product = products.find((p) => p.itemId === line.itemId);
        return product ? { ...line, unitPrice: suggestUnitPrice(product, nextCurrency) } : line;
      }),
    );
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setSupplierId('');
    setCurrency('USD');
    setPoDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setLines([{ itemId: '', quantityOrdered: 1, unitPrice: 0 }]);
    setEditingOrder(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSupplierId(order.supplierId);
    setCurrency(order.currency);
    setPoDate(order.poDate);
    setNotes(order.notes || '');
    setLines(
      order.lines && order.lines.length > 0
        ? order.lines.map((line) => ({
            itemId: line.itemId,
            quantityOrdered: Number(line.quantityOrdered),
            unitPrice: Number(line.unitPrice),
          }))
        : [{ itemId: '', quantityOrdered: 1, unitPrice: 0 }],
    );
    setShowCreateModal(true);
  };

  const handleLineChange = (idx: number, field: string, val: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = val;

    // If selecting product, suggest unit price
    if (field === 'itemId') {
      const prod = products.find((p) => p.itemId === val);
      if (prod) {
        updated[idx].unitPrice = suggestUnitPrice(prod, currency);
      }
    }
    setLines(updated);
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      showToast('error', 'Supplier is required');
      return;
    }
    const validLines = lines
      .filter((l) => l.itemId && l.quantityOrdered > 0 && l.unitPrice > 0)
      .map((line) => ({
        itemId: String(line.itemId),
        quantityOrdered: Number(line.quantityOrdered),
        unitPrice: Number(line.unitPrice),
      }));
    if (validLines.length === 0) {
      showToast('error', 'Please enter at least one valid line item');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: Number(supplierId),
        currency,
        poDate,
        notes,
        lines: validLines,
      };

      if (editingOrder) {
        const updated = await api.updatePurchaseOrder(editingOrder.poId, payload);
        showToast('success', `Purchase Order ${updated.poNumber} updated successfully!`);
      } else {
        const created = await api.createPurchaseOrder(payload);
        showToast('success', `Purchase Order ${created.poNumber} created in DRAFT status!`);
      }
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to save PO');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async (id: string, newStatus: string) => {
    try {
      await api.updatePurchaseOrderStatus(id, newStatus);
      showToast('success', `Purchase Order status transitioned to ${newStatus}`);
      loadData();
      if (selectedOrder && selectedOrder.poId === id) {
        const refreshed = await api.getPurchaseOrder(id);
        setSelectedOrder(refreshed);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Status transition failed');
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.poNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.supplier?.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalValueUsd = orders.reduce((sum, o) => {
    const orderTotal = o.lines?.reduce((lSum, l) => lSum + Number(l.quantityOrdered * l.unitPrice), 0) || 0;
    return sum + (o.currency === 'USD' ? orderTotal : orderTotal / 125);
  }, 0);

  const confirmedCount = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PARTIALLY_RECEIVED').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Logistics & Import</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Procurement</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Purchase Order Management</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            International Purchase Order Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Multi-currency contract tracking, supplier order validation, and stage-gate approval workflows
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh Feed
          </button>
          <button onClick={openCreateModal} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            Create Purchase Order
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
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              TOTAL PURCHASE ORDERS
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="var(--accent-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {orders.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {confirmedCount} Confirmed
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ready for shipment linkage</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              CONTRACT VALUE (USD EQ.)
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            ${Math.round(totalValueUsd).toLocaleString()}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across active foreign & domestic orders</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              APPROVAL BACKLOG
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} color="var(--accent-amber)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {orders.filter((o) => o.status === 'DRAFT' || o.status === 'SUBMITTED').length} Pending
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Draft & management review states</span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {[
            { id: '', label: `All (${orders.length})` },
            { id: 'DRAFT', label: `Draft (${orders.filter(o => o.status === 'DRAFT').length})` },
            { id: 'SUBMITTED', label: `Submitted (${orders.filter(o => o.status === 'SUBMITTED').length})` },
            { id: 'CONFIRMED', label: `Confirmed (${orders.filter(o => o.status === 'CONFIRMED').length})` },
            { id: 'PARTIALLY_RECEIVED', label: 'Partially Received' },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'CANCELLED', label: 'Cancelled' },
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

        <div style={{ position: 'relative', width: '320px', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search PO number, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Orders Master Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PO NUMBER</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPLIER / ORIGIN</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DATE & CURRENCY</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>LINES</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PO CONTRACT VALUE</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                    <div>Loading Purchase Orders feed...</div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No purchase orders found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const grandTotal = o.lines?.reduce((sum, l) => sum + Number(l.quantityOrdered * l.unitPrice), 0) || 0;
                  return (
                    <tr key={o.poId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                          {o.poNumber}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {o.supplier?.supplierName || 'Unknown Supplier'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Origin: {o.supplier?.country || 'International'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(o.poDate).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', fontWeight: 700 }}>
                          Currency: {o.currency}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <span className="badge badge-indigo">
                          {o.lines?.length || 0} line(s)
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-emerald)' }}>
                          {o.currency} {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            o.status === 'CONFIRMED' || o.status === 'RECEIVED'
                              ? 'badge-emerald'
                              : o.status === 'PARTIALLY_RECEIVED'
                              ? 'badge-cyan'
                              : o.status === 'SUBMITTED'
                              ? 'badge-indigo'
                              : o.status === 'CANCELLED'
                              ? 'badge-rose'
                              : 'badge-amber'
                          }`}
                        >
                          {o.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                            title="View Order Details"
                          >
                            <Eye size={13} /> View
                          </button>
                          {o.status === 'DRAFT' && (
                            <button
                              onClick={() => openEditModal(o)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-cyan)', borderColor: 'rgba(0, 210, 211, 0.4)' }}
                              title="Edit Draft Order"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          )}
                          {o.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusTransition(o.poId, 'SUBMITTED')}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                              title="Submit for Approval"
                            >
                              <Send size={13} /> Submit
                            </button>
                          )}
                          {o.status === 'SUBMITTED' && (
                            <button
                              onClick={() => handleStatusTransition(o.poId, 'CONFIRMED')}
                              className="btn btn-cyan"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              title="Confirm Order"
                            >
                              <Check size={13} /> Confirm
                            </button>
                          )}
                          {o.status !== 'CANCELLED' && o.status !== 'RECEIVED' && (
                            <button
                              onClick={() => handleStatusTransition(o.poId, 'CANCELLED')}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}
                              title="Cancel Order"
                            >
                              <XCircle size={13} />
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

      {/* Modal: New Purchase Order */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  {editingOrder ? `Edit Purchase Order ${editingOrder.poNumber}` : 'Create International Purchase Order'}
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Multi-currency procurement contract & line items</span>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleSavePO}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="form-label">Supplier Partner *</label>
                    <select
                      className="input"
                      value={supplierId}
                      onChange={(e) => setSupplierId(Number(e.target.value))}
                      required
                    >
                      <option value="">Select Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.supplierId} value={s.supplierId}>
                          {s.supplierName} ({s.country || 'Foreign'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Contract Currency *</label>
                    <select
                      className="input"
                      value={currency}
                      onChange={(e) => handleCurrencyChange(e.target.value as 'USD' | 'EUR' | 'ETB')}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="ETB">ETB (Br)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">PO Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Line items */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Ordered Vehicle / Part Line Items
                    </span>
                    <button type="button" onClick={handleAddLine} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>

                  {lines.map((l, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 2fr 1.5fr 40px', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Product Item</label>
                        <select
                          className="input"
                          value={l.itemId}
                          onChange={(e) => handleLineChange(idx, 'itemId', e.target.value)}
                          required
                        >
                          <option value="">Select Item / Vehicle...</option>
                          {products.map((p) => (
                            <option key={p.itemId} value={p.itemId}>
                              {p.itemName} ({p.model || p.itemCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Quantity</label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          value={l.quantityOrdered}
                          onChange={(e) => handleLineChange(idx, 'quantityOrdered', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Unit Price ({currency})</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="input"
                          value={l.unitPrice}
                          onChange={(e) => handleLineChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Line Total</label>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)', marginTop: '0.4rem' }}>
                          {(l.quantityOrdered * l.unitPrice).toLocaleString()}
                        </div>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem', color: 'var(--accent-rose)' }}
                          disabled={lines.length === 1}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grand Total Summary */}
                <div style={{ background: 'rgba(0, 210, 211, 0.08)', border: '1px solid rgba(0, 210, 211, 0.2)', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>Total Purchase Order Contract Value:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.35rem' }}>
                    {currency} {lines.reduce((sum, l) => sum + (l.quantityOrdered * l.unitPrice), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <label className="form-label">Contract Terms & Logistics Notes</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Incoterms (CIF Djibouti, FOB Shanghai), payment terms (LC at sight, CAD)..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Saving Contract...' : editingOrder ? 'Update Purchase Order' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View PO Details */}
      {selectedOrder && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '780px' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PURCHASE ORDER SPECIFICATION</div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '0.2rem 0', fontFamily: 'monospace' }}>
                  {selectedOrder.poNumber}
                </h2>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Supplier: <strong style={{ color: 'var(--text-primary)' }}>{selectedOrder.supplier?.supplierName}</strong> ({selectedOrder.supplier?.country})
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-emerald">{selectedOrder.status}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Date: {new Date(selectedOrder.poDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="modal-body">
              <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.65rem', color: 'var(--text-primary)' }}>Contract Line Items</div>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem' }}>
                <thead>
                  <tr style={{ background: '#090D16' }}>
                    <th style={{ padding: '0.7rem 0.9rem', textAlign: 'left', fontSize: '0.72rem' }}>ITEM</th>
                    <th style={{ padding: '0.7rem 0.9rem', textAlign: 'center', fontSize: '0.72rem' }}>QTY ORDERED</th>
                    <th style={{ padding: '0.7rem 0.9rem', textAlign: 'right', fontSize: '0.72rem' }}>UNIT PRICE</th>
                    <th style={{ padding: '0.7rem 0.9rem', textAlign: 'right', fontSize: '0.72rem' }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.lines?.map((l) => (
                    <tr key={l.poLineId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 0.9rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{l.item?.itemName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Code: {l.item?.itemCode}</div>
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', textAlign: 'center', fontWeight: 600 }}>
                        {Number(l.quantityOrdered).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', textAlign: 'right' }}>
                        {l.currency} {Number(l.unitPrice).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 0.9rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {l.currency} {(Number(l.quantityOrdered) * Number(l.unitPrice)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedOrder.notes && (
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', padding: '0.85rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Logistics Notes:</strong> {selectedOrder.notes}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setSelectedOrder(null)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
