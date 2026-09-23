import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRightLeft,
  XCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  api,
  Booking,
  Customer,
  ProductItem,
} from '../../api/client';

export const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Create Form State
  const [newBooking, setNewBooking] = useState<{
    customerId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    requiredAdvanceAmount: number;
    salespersonName: string;
    targetDeliveryDate: string;
  }>({
    customerId: '',
    itemId: '',
    quantity: 1,
    unitPrice: 0,
    requiredAdvanceAmount: 0,
    salespersonName: 'Sales Specialist',
    targetDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Transfer Form State
  const [transferData, setTransferData] = useState<{
    destinationBookingId: string;
    amount: number;
    reason: string;
  }>({
    destinationBookingId: '',
    amount: 0,
    reason: '',
  });

  // Cancel Form State
  const [cancelData, setCancelData] = useState<{
    reason: string;
    routeTo: 'REFUNDABLE' | 'CREDIT';
  }>({
    reason: '',
    routeTo: 'REFUNDABLE',
  });

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
      const [bookingsRes, custRes, prodRes] = await Promise.all([
        api.getBookings(),
        api.getCustomers(),
        api.getItems(),
      ]);
      setBookings(bookingsRes.items || []);
      setCustomers(custRes.items || []);
      setProducts(prodRes.items || []);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (itemId: string) => {
    const prod = products.find((p) => p.itemId === itemId);
    if (prod) {
      const unitPrice = Number(prod.sellingPrice) || 0;
      const subtotal = unitPrice * (newBooking.quantity || 1);
      const vat = subtotal * 0.15;
      const gross = subtotal + vat;
      const advReq = Math.round(gross * 0.2); // 20% standard advance
      setNewBooking({
        ...newBooking,
        itemId,
        unitPrice,
        requiredAdvanceAmount: advReq,
      });
    } else {
      setNewBooking({ ...newBooking, itemId });
    }
  };

  const handleQuantityChange = (qty: number) => {
    const subtotal = (newBooking.unitPrice || 0) * qty;
    const gross = subtotal * 1.15;
    const advReq = Math.round(gross * 0.2);
    setNewBooking({
      ...newBooking,
      quantity: qty,
      requiredAdvanceAmount: advReq,
    });
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBooking.customerId || !newBooking.itemId) {
      showToast('error', 'Customer and Vehicle Item are required');
      return;
    }
    setSaving(true);
    try {
      await api.createBooking({
        customerId: newBooking.customerId,
        itemId: newBooking.itemId,
        quantity: newBooking.quantity,
        unitPrice: newBooking.unitPrice,
        requiredAdvanceAmount: newBooking.requiredAdvanceAmount,
        salespersonName: newBooking.salespersonName,
        targetDeliveryDate: newBooking.targetDeliveryDate ? new Date(newBooking.targetDeliveryDate).toISOString() : undefined,
      });
      showToast('success', 'Advance Booking created successfully!');
      setShowCreateModal(false);
      setNewBooking({
        customerId: '',
        itemId: '',
        quantity: 1,
        unitPrice: 0,
        requiredAdvanceAmount: 0,
        salespersonName: 'Sales Specialist',
        targetDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!transferData.destinationBookingId || transferData.amount <= 0) {
      showToast('error', 'Please specify a destination booking and valid transfer amount');
      return;
    }
    setSaving(true);
    try {
      await api.transferBookingFunds({
        sourceBookingId: selectedBooking.bookingId,
        destinationBookingId: transferData.destinationBookingId,
        amount: transferData.amount,
        reason: transferData.reason,
      });
      showToast('success', `ETB ${transferData.amount.toLocaleString()} transferred successfully`);
      setShowTransferModal(false);
      setSelectedBooking(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;
    setSaving(true);
    try {
      await api.cancelBooking(selectedBooking.bookingId, cancelData.reason, cancelData.routeTo);
      showToast('success', `Booking ${selectedBooking.bookingNumber} cancelled and deposits re-routed`);
      setShowCancelModal(false);
      setSelectedBooking(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Cancellation failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.bookingNumber?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      b.item?.itemName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || b.bookingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Analytics
  const totalBookedValue = bookings.reduce((sum, b) => sum + Number(b.grossTotal || 0), 0);
  const totalDepositsCollected = bookings.reduce((sum, b) => sum + Number(b.totalAmountDeposited || 0), 0);
  const activeBookingsCount = bookings.filter((b) => b.bookingStatus === 'APPROVED' || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'PENDING_APPROVAL').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Financial Engine</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Commercial Sales</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Advance Bookings Queue</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Advance Order & Booking Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Advance customer deposits, vehicle queue prioritization, deposit fund transfers, and cancellation routing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            Create Booking
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
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL BOOKINGS</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bookmark size={17} color="var(--accent-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{bookings.length}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
              {activeBookingsCount} Active Queue
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orders awaiting fulfillment</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL BOOKED VALUE</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={17} color="var(--accent-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            ETB {totalBookedValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Across all commercial orders</div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEPOSITS COLLECTED</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={17} color="var(--accent-emerald)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            ETB {totalDepositsCollected.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
            {totalBookedValue > 0 ? ((totalDepositsCollected / totalBookedValue) * 100).toFixed(1) : 0}% aggregate deposit collection rate
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {['', 'PENDING_APPROVAL', 'APPROVED', 'CONFIRMED', 'ALLOTTED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`filter-pill ${statusFilter === st ? 'active' : ''}`}
            >
              {st === '' ? 'All Statuses' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search booking #, customer, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>BOOKING REF</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>VEHICLE ITEM / QTY</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>GROSS TOTAL</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DEPOSIT PROGRESS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>TARGET DELIVERY</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading Advance Bookings...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No bookings found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const custName = b.customer?.fullName || 'Customer';
                  const total = Number(b.grossTotal || 0);
                  const paid = Number(b.totalAmountDeposited || 0);
                  const adv = Number(b.requiredAdvanceAmount || 0);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                  const isAdvMet = paid >= adv && adv > 0;

                  return (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                          {b.bookingNumber}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {new Date(b.bookingDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{custName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Code: {b.customer?.customerCode} • {b.customer?.customerType}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {b.item?.itemName || 'Vehicle Item'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Qty: {b.quantity} unit(s) • ETB {Number(b.unitPrice || 0).toLocaleString()}/unit
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          ETB {total.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Bal: ETB {Number(b.outstandingBalance || 0).toLocaleString()}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', minWidth: '220px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: isAdvMet ? 'var(--accent-emerald)' : 'var(--accent-amber)', fontWeight: 600 }}>
                            Paid: ETB {paid.toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>Req: ETB {adv.toLocaleString()}</span>
                        </div>
                        <div style={{ width: '100%', height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: isAdvMet ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const delivery = b.targetDeliveryDate
                            ? new Date(b.targetDeliveryDate)
                            : new Date(new Date(b.bookingDate).getTime() + 30 * 24 * 60 * 60 * 1000);
                          const daysDiff = Math.ceil((delivery.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          const isOverdue = daysDiff < 0 && b.bookingStatus !== 'SETTLED' && b.bookingStatus !== 'CANCELLED';
                          const isDueSoon = daysDiff >= 0 && daysDiff <= 7 && b.bookingStatus !== 'SETTLED';

                          return (
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                                {delivery.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                              </div>
                              <div style={{ marginTop: '0.2rem' }}>
                                {isOverdue ? (
                                  <span className="badge badge-rose" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                                    ⚠️ Overdue ({Math.abs(daysDiff)}d)
                                  </span>
                                ) : isDueSoon ? (
                                  <span className="badge badge-amber" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                                    ⏳ Due Soon ({daysDiff}d)
                                  </span>
                                ) : (
                                  <span className="badge badge-subtle" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                                    📅 {daysDiff}d left
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'APPROVED'
                              ? 'badge-emerald'
                              : b.bookingStatus === 'PENDING_APPROVAL'
                              ? 'badge-amber'
                              : b.bookingStatus === 'CANCELLED'
                              ? 'badge-rose'
                              : 'badge-indigo'
                          }`}
                        >
                          {b.bookingStatus}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {b.bookingStatus !== 'CANCELLED' && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setTransferData({ destinationBookingId: '', amount: Number(b.totalAmountDeposited || 0), reason: '' });
                                  setShowTransferModal(true);
                                }}
                                disabled={paid <= 0}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}
                                title="Transfer deposited funds to another booking"
                              >
                                <ArrowRightLeft size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setCancelData({ reason: '', routeTo: 'REFUNDABLE' });
                                  setShowCancelModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem', color: 'var(--accent-rose)' }}
                                title="Cancel booking & reverse funds"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
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

      {/* Modal: Create Booking */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Create Advance Order Booking
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer allocation & required deposit stamping</span>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Customer *</label>
                    <select
                      className="input"
                      value={newBooking.customerId}
                      onChange={(e) => setNewBooking({ ...newBooking, customerId: e.target.value })}
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
                    <label className="form-label">Vehicle Item *</label>
                    <select
                      className="input"
                      value={newBooking.itemId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      required
                    >
                      <option value="">Select Vehicle Item...</option>
                      {products.map((p) => (
                        <option key={p.itemId} value={p.itemId}>
                          {p.itemName} (ETB {Number(p.sellingPrice).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Order Quantity</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={newBooking.quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Unit Price (ETB)</label>
                    <input
                      type="number"
                      className="input"
                      value={newBooking.unitPrice}
                      onChange={(e) => {
                        const up = parseFloat(e.target.value) || 0;
                        const sub = up * newBooking.quantity;
                        setNewBooking({
                          ...newBooking,
                          unitPrice: up,
                          requiredAdvanceAmount: Math.round(sub * 1.15 * 0.2),
                        });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Min Advance Req (ETB)</label>
                    <input
                      type="number"
                      className="input"
                      value={newBooking.requiredAdvanceAmount}
                      onChange={(e) => setNewBooking({ ...newBooking, requiredAdvanceAmount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 210, 211, 0.08)', border: '1px solid rgba(0, 210, 211, 0.2)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Gross Total (incl. 15% VAT):</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>
                      ETB {Math.round(newBooking.quantity * newBooking.unitPrice * 1.15).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Sales Representative Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newBooking.salespersonName}
                      onChange={(e) => setNewBooking({ ...newBooking, salespersonName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Target Delivery Date *</label>
                    <input
                      type="date"
                      className="input"
                      value={newBooking.targetDeliveryDate}
                      onChange={(e) => setNewBooking({ ...newBooking, targetDeliveryDate: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer Booking Deposit */}
      {showTransferModal && selectedBooking && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Transfer Advance Deposit Funds
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transfer collected deposits to another active order</span>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleTransfer}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Transfer funds from <strong style={{ color: 'var(--accent-cyan)' }}>{selectedBooking.bookingNumber}</strong> (Deposited balance:{' '}
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    ETB {Number(selectedBooking.totalAmountDeposited || 0).toLocaleString()}
                  </span>
                  ) to another active booking for customer <strong>{selectedBooking.customer?.fullName}</strong>.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Select Destination Booking *</label>
                  <select
                    className="input"
                    value={transferData.destinationBookingId}
                    onChange={(e) => setTransferData({ ...transferData, destinationBookingId: e.target.value })}
                    required
                  >
                    <option value="">Select Destination Booking...</option>
                    {bookings
                      .filter((b) => b.bookingId !== selectedBooking.bookingId && b.bookingStatus !== 'CANCELLED' && b.customerId === selectedBooking.customerId)
                      .map((b) => (
                        <option key={b.bookingId} value={b.bookingId}>
                          {b.bookingNumber} - {b.item?.itemName} (Bal: ETB {Number(b.outstandingBalance || 0).toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Transfer Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    max={Number(selectedBooking.totalAmountDeposited || 0)}
                    className="input"
                    value={transferData.amount}
                    onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Transfer Justification</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={transferData.reason}
                    onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                    placeholder="e.g. Customer re-directed deposit towards urgent fleet order"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowTransferModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cancel Booking */}
      {showCancelModal && selectedBooking && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                  Cancel Order Booking
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Terminate reservation and re-route deposits</span>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>✕</button>
            </div>

            <form onSubmit={handleCancel}>
              <div className="modal-body">
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Are you sure you want to cancel booking <strong style={{ color: 'var(--text-primary)' }}>{selectedBooking.bookingNumber}</strong>?
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Cancellation Reason *</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={cancelData.reason}
                    onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                    placeholder="Customer request, allocation timeout, financing rejected..."
                    required
                  />
                </div>

                {Number(selectedBooking.totalAmountDeposited || 0) > 0 && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-rose)', marginBottom: '0.5rem' }}>
                      Deposit Re-routing (ETB {Number(selectedBooking.totalAmountDeposited).toLocaleString()})
                    </div>
                    <select
                      className="input"
                      value={cancelData.routeTo}
                      onChange={(e) => setCancelData({ ...cancelData, routeTo: e.target.value as any })}
                    >
                      <option value="REFUNDABLE">Route to Customer Refundable Balance (enables refund payout)</option>
                      <option value="CREDIT">Route to Customer Credit Balance (retains in company)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCancelModal(false)} className="btn btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={saving} className="btn" style={{ background: 'var(--accent-rose)', color: '#fff', fontWeight: 700 }}>
                  {saving ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
