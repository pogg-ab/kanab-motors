import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  Package,
  DollarSign,
  AlertCircle,
  X,
  Clock,
  Layers,
  Printer,
} from 'lucide-react';
import {
  api,
  SalesEnquiry,
  Customer,
  ProductItem,
} from '../../api/client';

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<SalesEnquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    itemId: '',
    quantity: 1,
    unitPrice: '',
    salespersonName: 'Abel Legesse',
    paymentMode: 'BANK_DEPOSIT',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Convert to Booking Modal State (Replaces browser alert/confirm)
  const [convertTarget, setConvertTarget] = useState<SalesEnquiry | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<{
    bookingNumber: string;
    enquiryNumber: string;
  } | null>(null);

  // Rejection Modal State (Story E9)
  const [rejectTarget, setRejectTarget] = useState<SalesEnquiry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);

  // Printable Proforma Quotation Modal (Story E13)
  const [selectedQuote, setSelectedQuote] = useState<SalesEnquiry | null>(null);

  const fetchDependencies = async () => {
    try {
      const [custRes, itemRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getItems({ limit: 100 }),
      ]);
      setCustomers(custRes.items);
      setItems(itemRes.items);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await api.getEnquiries(params);
      setEnquiries(res.items);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchEnquiries();
  }, [selectedStatus, search]);

  const handleOpenCreate = () => {
    const defaultItem = items[0];
    setFormData({
      customerId: customers[0]?.customerId || '',
      itemId: defaultItem?.itemId || '',
      quantity: 1,
      unitPrice: defaultItem ? defaultItem.sellingPrice.toString() : '',
      salespersonName: 'Abel Legesse',
      paymentMode: 'BANK_DEPOSIT',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleItemSelect = (itemId: string) => {
    const selected = items.find((i) => i.itemId === itemId);
    setFormData({
      ...formData,
      itemId,
      unitPrice: selected ? selected.sellingPrice.toString() : formData.unitPrice,
    });
  };

  // Live VAT & Total computation
  const selectedItemObj = items.find((i) => i.itemId === formData.itemId);
  const currentPrice = parseFloat(formData.unitPrice) || 0;
  const currentQty = formData.quantity || 1;
  const subtotal = currentPrice * currentQty;
  const taxPct = selectedItemObj?.taxConfig ? Number(selectedItemObj.taxConfig.taxRatePct) : 15.0;
  const vatAmount = (subtotal * taxPct) / 100;
  const totalValue = subtotal + vatAmount;

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.customerId || !formData.itemId) {
      setFormError('Please select both a Customer and a Product Model');
      return;
    }

    setSubmitting(true);
    try {
      await api.createEnquiry({
        customerId: formData.customerId,
        itemId: formData.itemId,
        quantity: formData.quantity,
        unitPrice: currentPrice,
        salespersonName: formData.salespersonName,
        paymentMode: formData.paymentMode,
      });
      setIsCreateOpen(false);
      fetchEnquiries();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create enquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (enquiryId: string) => {
    try {
      await api.updateEnquiryStatus(enquiryId, 'APPROVED');
      fetchEnquiries();
    } catch (err: any) {
      console.error('Failed to approve enquiry:', err);
    }
  };

  const handleConfirmConvert = async () => {
    if (!convertTarget) return;
    setConverting(true);
    setConvertError(null);
    try {
      const bkg = await api.convertEnquiryToBooking(convertTarget.enquiryId);
      setConversionSuccess({
        bookingNumber: bkg.bookingNumber,
        enquiryNumber: convertTarget.enquiryNumber,
      });
      setConvertTarget(null);
      fetchEnquiries();
    } catch (err: any) {
      setConvertError(err.response?.data?.message || 'Failed to convert enquiry to booking');
    } finally {
      setConverting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Please enter a detailed rejection reason (minimum 5 characters)');
      return;
    }
    setRejecting(true);
    setRejectError(null);
    try {
      await api.updateEnquiryStatus(rejectTarget.enquiryId, 'REJECTED', rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      fetchEnquiries();
    } catch (err: any) {
      setRejectError(err.response?.data?.message || 'Failed to reject enquiry');
    } finally {
      setRejecting(false);
    }
  };

  // Metrics
  const total = enquiries.length;
  const pending = enquiries.filter((e) => e.status === 'SUBMITTED').length;
  const approved = enquiries.filter((e) => e.status === 'APPROVED').length;
  const converted = enquiries.filter((e) => e.status === 'CONVERTED').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Financial Engine</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Commercial Sales</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Sales Enquiry Pipeline</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Sales Enquiry & Quotation Pipeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Customer vehicle interests, automated 15% VAT calculation, manager approval, and 1-click booking conversion
          </p>
        </div>

        <button className="btn btn-cyan" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> New Sales Enquiry
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.75rem',
      }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ENQUIRIES</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={17} color="var(--accent-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Active commercial pipeline</div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING APPROVAL</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={17} color="var(--accent-amber)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {pending}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Awaiting manager sign-off</div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APPROVED ENQUIRIES</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {approved}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Ready to convert to booking</div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVERTED ORDERS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={17} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {converted}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Active vehicle reservations</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {['ALL', 'SUBMITTED', 'APPROVED', 'CONVERTED', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`filter-pill ${selectedStatus === st ? 'active' : ''}`}
              onClick={() => setSelectedStatus(st)}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
          <Search
            size={15}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
            placeholder="Search enquiry number, customer, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ENQUIRY #</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>VEHICLE MODEL</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center' }}>QTY</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'right' }}>ESTIMATED VALUE (15% VAT)</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SALESPERSON</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading sales enquiries...
                  </td>
                </tr>
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No sales enquiries found. Click "+ New Sales Enquiry" to begin.
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <tr key={enq.enquiryId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {enq.enquiryNumber}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {new Date(enq.createdAt).toLocaleDateString()}
                      </div>
                      <div style={{ marginTop: '0.2rem' }}>
                        {(() => {
                          const daysRemaining = 30 - Math.floor((Date.now() - new Date(enq.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <span
                              className={`badge ${daysRemaining > 7 ? 'badge-subtle' : daysRemaining > 0 ? 'badge-amber' : 'badge-rose'}`}
                              style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}
                              title={`Quotation validity window: 30 days (${daysRemaining} days remaining)`}
                            >
                              ⏳ {daysRemaining > 0 ? `${daysRemaining}d valid` : 'Expired'}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{enq.customer?.fullName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {enq.customer?.mobileNumber}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{enq.item?.itemName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Code: {enq.item?.itemCode}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                      <span className="mono-code">{enq.quantity}</span>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        ETB {Number(enq.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        VAT (15%): ETB {Number(enq.vatAmount).toLocaleString()}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                        <User size={13} color="var(--text-muted)" />
                        <span>{enq.salespersonName}</span>
                      </div>
                      {enq.paymentMode && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
                          {enq.paymentMode.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          enq.status === 'CONVERTED'
                            ? 'badge-emerald'
                            : enq.status === 'APPROVED'
                            ? 'badge-cyan'
                            : enq.status === 'SUBMITTED'
                            ? 'badge-amber'
                            : 'badge-rose'
                        }`}
                      >
                        {enq.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        {enq.status === 'SUBMITTED' && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                              onClick={() => handleApprove(enq.enquiryId)}
                            >
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                              onClick={() => {
                                setRejectTarget(enq);
                                setRejectReason('');
                                setRejectError(null);
                              }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                        {enq.status === 'APPROVED' && (
                          <button
                            className="btn btn-cyan btn-sm"
                            onClick={() => {
                              setConvertError(null);
                              setConvertTarget(enq);
                            }}
                          >
                            Convert to Booking <ArrowRight size={13} />
                          </button>
                        )}
                        {enq.status === 'CONVERTED' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            ✓ Active Booking
                          </span>
                        )}
                        {enq.status === 'REJECTED' && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontStyle: 'italic' }} title={enq.rejectionReason}>
                            {enq.rejectionReason ? `Reason: ${enq.rejectionReason.slice(0, 20)}...` : 'Rejected'}
                          </span>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.35rem 0.6rem' }}
                          title="View & Print Official Quotation / Proforma Invoice (Story E13)"
                          onClick={() => setSelectedQuote(enq)}
                        >
                          <Printer size={13} /> Quote
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ENQUIRY MODAL */}
      {isCreateOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={20} color="var(--accent-indigo)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Create Sales Enquiry</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Capture customer vehicle interest with real-time VAT calculation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner-danger">
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select
                    className="select-field"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  >
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.customerCode} — {c.fullName} ({c.customerType})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Model *</label>
                    <select
                      className="select-field"
                      required
                      value={formData.itemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                    >
                      {items.map((i) => (
                        <option key={i.itemId} value={i.itemId}>
                          {i.itemCode} — {i.itemName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salesperson *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      placeholder="e.g. Dawit Kebede"
                      value={formData.salespersonName}
                      onChange={(e) => setFormData({ ...formData, salespersonName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Intended Payment Mode *</label>
                  <select
                    className="select-field"
                    required
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  >
                    <option value="BANK_DEPOSIT">Bank Deposit Voucher (BRV)</option>
                    <option value="BANK_TRANSFER">Direct Electronic Bank Transfer</option>
                    <option value="LETTER_OF_CREDIT">Letter of Credit (LC)</option>
                    <option value="CHEQUE">CPO / Bank Certified Cheque</option>
                    <option value="CASH">Cash Payment</option>
                  </select>
                </div>

                {/* Live Value Calculation Preview Box */}
                <div style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginTop: '1rem',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Calculation Summary:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal ({currentQty} unit @ ETB {currentPrice.toLocaleString()}):</span>
                    <span>ETB {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>VAT ({taxPct}%):</span>
                    <span style={{ color: 'var(--accent-blue)' }}>ETB {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>Estimated Sales Value:</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>ETB {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BEAUTIFUL CONVERT TO BOOKING CONFIRMATION MODAL */}
      {convertTarget && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 210, 211, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Convert to Vehicle Booking</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Generate an official booking for {convertTarget.enquiryNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertTarget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {convertError && (
                <div className="alert-banner-danger" style={{ marginBottom: '1rem' }}>
                  {convertError}
                </div>
              )}

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', padding: '1.15rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{convertTarget.customer?.fullName || 'Selected Customer'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vehicle Model:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{convertTarget.item?.itemName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Order Quantity:</span>
                  <span style={{ fontWeight: 700 }}>{convertTarget.quantity} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Quotation Total:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    ETB {Number(convertTarget.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Required 25% Advance:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>
                    ETB {(Number(convertTarget.estimatedSalesValue) * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(99, 102, 241, 0.08)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                ℹ Converting this quotation will generate an immutable reservation order in <strong>Advance Bookings</strong>, lock vehicle pricing, and enable receipt of advance bank deposits (BRV).
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConvertTarget(null)}
                disabled={converting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-cyan"
                onClick={handleConfirmConvert}
                disabled={converting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {converting ? 'Generating Booking...' : <>Confirm & Convert <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERSION SUCCESS MODAL */}
      {conversionSuccess && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center' }}>
            <div style={{ padding: '2rem 1.5rem 1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={32} color="var(--accent-emerald)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Booking Successfully Created!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Enquiry <strong style={{ color: 'var(--text-primary)' }}>{conversionSuccess.enquiryNumber}</strong> has been converted into official Booking:
              </p>
              <div style={{ background: 'rgba(0, 210, 211, 0.1)', border: '1px solid rgba(0, 210, 211, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>
                  {conversionSuccess.bookingNumber}
                </span>
              </div>
              <button
                className="btn btn-cyan"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setConversionSuccess(null)}
              >
                Continue to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BEAUTIFUL REJECTION MODAL (Story E9) */}
      {rejectTarget && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={20} color="var(--accent-rose)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Reject Sales Enquiry</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Provide mandatory audit justification for {rejectTarget.enquiryNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="modal-body">
                {rejectError && (
                  <div className="alert-banner-danger" style={{ marginBottom: '1rem' }}>
                    {rejectError}
                  </div>
                )}

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  <div>Customer: <strong style={{ color: 'var(--text-primary)' }}>{rejectTarget.customer?.fullName}</strong></div>
                  <div style={{ marginTop: '0.25rem' }}>Model: <span style={{ color: 'var(--accent-cyan)' }}>{rejectTarget.item?.itemName}</span></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Rejection Reason *</label>
                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder="e.g. Customer chose alternative leasing terms"
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    * Required for internal sales audit and compliance (minimum 5 characters).
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectTarget(null)}
                  disabled={rejecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                  disabled={rejecting}
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PROFORMA INVOICE / QUOTATION MODAL (Story E13) */}
      {selectedQuote && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px', padding: '0', background: '#0d1322', overflow: 'hidden' }}>
            {/* Modal Header Controls (Screen Only) */}
            <div className="no-print" style={{ padding: '1rem 1.5rem', background: '#090D16', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} color="var(--accent-cyan)" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Proforma Quotation — {selectedQuote.enquiryNumber}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  className="btn btn-cyan btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={14} /> Print Quotation (PDF)
                </button>
                <button
                  onClick={() => setSelectedQuote(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Official Printable Proforma Document */}
            <div style={{ padding: '2rem', background: '#ffffff', color: '#0f172a' }}>
              {/* Header Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ background: '#0f172a', color: '#ffffff', fontWeight: 900, padding: '0.25rem 0.55rem', borderRadius: '4px', fontSize: '1rem' }}>
                      KM
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                        KANAB MOTORS PLC
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>
                        Automotive Assembly & Commercial Distribution
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: '0.35rem', lineHeight: 1.4 }}>
                    Gotera Distribution Center · Debre Zeit Road, Addis Ababa, Ethiopia<br />
                    TIN: 0048291048 · VAT: 8291048002 · Tel: +251-11-467-1122
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase' }}>
                    Proforma Invoice
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                    Quote Ref: <strong style={{ color: '#0f172a' }}>{selectedQuote.enquiryNumber}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Date: <strong style={{ color: '#0f172a' }}>{new Date(selectedQuote.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>
                    Validity: 30 Calendar Days
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.85rem', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Customer Information</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{selectedQuote.customer?.fullName}</div>
                  <div style={{ color: '#475569' }}>Code: <strong>{selectedQuote.customer?.customerCode}</strong> | Type: {selectedQuote.customer?.customerType}</div>
                  <div style={{ color: '#475569' }}>Phone: {selectedQuote.customer?.mobileNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Sales Attribution</div>
                  <div style={{ color: '#0f172a', marginTop: '0.15rem' }}>Salesperson: <strong>{selectedQuote.salespersonName}</strong></div>
                  <div style={{ color: '#475569' }}>Payment Mode: {selectedQuote.paymentMode?.replace(/_/g, ' ') || 'Bank Deposit'}</div>
                  <div style={{ color: '#475569' }}>Quote Status: <strong>{selectedQuote.status}</strong></div>
                </div>
              </div>

              {/* Itemized Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '1.25rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#0f172a', fontWeight: 700 }}>ITEM DESCRIPTION / MODEL</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>QTY</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>UNIT PRICE (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>SUBTOTAL (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>VAT 15% (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>TOTAL (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', color: '#0f172a' }}>
                      <strong style={{ color: '#0f172a' }}>{selectedQuote.item?.itemName}</strong>
                      <div style={{ fontSize: '7pt', color: '#64748b' }}>Code: {selectedQuote.item?.itemCode}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>
                      {selectedQuote.quantity}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {Number(selectedQuote.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {(Number(selectedQuote.unitPrice) * selectedQuote.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {Number(selectedQuote.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {Number(selectedQuote.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Financial Summary & Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Commercial Terms & Conditions:</div>
                  1. Advance Deposit: 25% minimum required upon formal booking confirmation.<br />
                  2. Balance: 75% due upon physical vehicle readiness and chassis inspection.<br />
                  3. Validity: Prices guaranteed for 30 calendar days from issuance.<br />
                  4. Bank Account: Commercial Bank of Ethiopia (CBE) · A/C: 1000-4829-1048-002
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>ETB {(Number(selectedQuote.unitPrice) * selectedQuote.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: '#475569' }}>
                    <span>VAT (15%):</span>
                    <span>ETB {Number(selectedQuote.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', paddingTop: '0.45rem', borderTop: '2px solid #0f172a' }}>
                    <span>Grand Total:</span>
                    <span>ETB {Number(selectedQuote.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#b45309', fontWeight: 700, marginTop: '0.35rem' }}>
                    <span>Req. Advance (25%):</span>
                    <span>ETB {(Number(selectedQuote.estimatedSalesValue) * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Sign-off & Stamp Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem', fontSize: '0.7rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Prepared By:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>{selectedQuote.salespersonName}</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Approved By:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>Sales Operations Manager</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', textAlign: 'center', padding: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>OFFICIAL STAMP</span>
                  <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>KANAB MOTORS PLC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
