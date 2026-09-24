import React, { useState, useEffect } from 'react';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Plus,
  X,
  ShieldAlert,
  Layers,
  RotateCcw,
  Check,
  Building,
  Info,
} from 'lucide-react';
import {
  api,
  Allotment,
  EligibleBooking,
  VehicleUnit,
} from '../../api/client';

export const AllotmentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'allotments' | 'queue'>('allotments');
  const [allotments, setAllotments] = useState<Allotment[]>([]);
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showReverseModal, setShowReverseModal] = useState<boolean>(false);
  const [targetAllotment, setTargetAllotment] = useState<Allotment | null>(null);

  // Form states
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [allotmentNotes, setAllotmentNotes] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [allotRes, eligRes] = await Promise.all([
        api.getAllotments(),
        api.getEligibleBookings(),
      ]);
      setAllotments(allotRes.items || []);
      setEligibleBookings(eligRes || []);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to load allotment data');
    } finally {
      setLoading(false);
    }
  };

  // When selected booking changes in Create modal, fetch candidate vehicles matching booking's item
  useEffect(() => {
    if (!selectedBookingId) {
      setAvailableVehicles([]);
      setSelectedUnitIds([]);
      return;
    }
    const b = eligibleBookings.find((item) => item.bookingId === selectedBookingId);
    if (b && b.itemId) {
      api
        .getAvailableAllotmentVehicles(b.itemId)
        .then((units) => {
          setAvailableVehicles(units || []);
          setSelectedUnitIds([]);
        })
        .catch((err) => {
          showToast('error', 'Failed to load matching available vehicles');
        });
    }
  }, [selectedBookingId, eligibleBookings]);

  const handleOpenCreateModal = (presetBookingId?: string) => {
    setSelectedBookingId(presetBookingId || (eligibleBookings.length > 0 ? eligibleBookings[0].bookingId : ''));
    setSelectedUnitIds([]);
    setAllotmentNotes('');
    setShowCreateModal(true);
  };

  const handleToggleUnitSelection = (unitId: string, maxAllowed: number) => {
    if (selectedUnitIds.includes(unitId)) {
      setSelectedUnitIds(selectedUnitIds.filter((id) => id !== unitId));
    } else {
      if (selectedUnitIds.length >= maxAllowed) {
        showToast('error', `Cannot select more than ${maxAllowed} remaining unit(s) for this booking`);
        return;
      }
      setSelectedUnitIds([...selectedUnitIds, unitId]);
    }
  };

  const handleCreateAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingId || selectedUnitIds.length === 0) {
      showToast('error', 'Please select a booking and at least one vehicle unit to allot');
      return;
    }

    setSaving(true);
    try {
      const created = await api.createAllotment({
        bookingId: selectedBookingId,
        vehicleUnitIds: selectedUnitIds,
        notes: allotmentNotes.trim(),
      });
      showToast('success', `Allotment request ${created.allotmentNumber} created for ${selectedUnitIds.length} vehicle(s)!`);
      setShowCreateModal(false);
      setSelectedBookingId('');
      setSelectedUnitIds([]);
      setAllotmentNotes('');
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Allotment request creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAllotment = async (id: string) => {
    setActioningId(id);
    try {
      const updated = await api.approveAllotment(id);
      showToast('success', `Allotment ${updated.allotmentNumber} approved! Physical vehicles are now marked ALLOTTED.`);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Allotment approval failed');
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAllotment || !rejectionReason.trim()) return;

    setSaving(true);
    try {
      await api.rejectAllotment(targetAllotment.allotmentId, rejectionReason.trim());
      showToast('success', `Allotment ${targetAllotment.allotmentNumber} rejected.`);
      setShowRejectModal(false);
      setTargetAllotment(null);
      setRejectionReason('');
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Rejection failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReverseAllotment = async () => {
    if (!targetAllotment) return;

    setSaving(true);
    try {
      await api.reverseAllotment(targetAllotment.allotmentId);
      showToast('success', `Allotment ${targetAllotment.allotmentNumber} reversed! Physical vehicles returned to AVAILABLE_FOR_SALE.`);
      setShowReverseModal(false);
      setTargetAllotment(null);
      loadData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Allotment reversal failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredAllotments = allotments.filter((a) => {
    const matchesSearch =
      a.allotmentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      a.booking?.bookingNumber?.toLowerCase().includes(search.toLowerCase()) ||
      a.booking?.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      a.lines?.some((l) => l.vehicleUnit?.chassisNumber?.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAllottedUnits = allotments
    .filter((a) => a.status === 'APPROVED')
    .reduce((sum, a) => sum + (a.lines ? a.lines.filter((l) => l.isActive).length : 0), 0);

  const pendingApprovalCount = allotments.filter((a) => a.status === 'REQUESTED').length;

  const currentBooking = eligibleBookings.find((b) => b.bookingId === selectedBookingId);
  const remainingNeeded = currentBooking ? currentBooking.remainingQuantity : 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Logistics & Sales Pipeline</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Orders & Inventory</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Vehicle Allotment Management (KMSICAMS-5)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Vehicle Allotment Management
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    VIN / Chassis matching, deposit verification, multi-layer double-allocation defense & reversal workflow
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button onClick={loadData} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => handleOpenCreateModal()}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              disabled={eligibleBookings.length === 0}
            >
              <Plus size={16} />
              New Allotment Request
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{notification.msg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Allotted Units</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <Car size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
            {totalAllottedUnits}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Locked to confirmed customer orders
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending Approvals</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
            {pendingApprovalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Awaiting manager approval authorization
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Eligible Bookings Queue</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>
            {eligibleBookings.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Deposit verified, awaiting vehicle allotment
          </div>
        </div>
      </div>

      {/* Tabs Nav */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('allotments')}
          className={`filter-pill ${activeTab === 'allotments' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Car size={15} />
          <span>Allotment Records & Approvals ({allotments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`filter-pill ${activeTab === 'queue' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Layers size={15} />
          <span>Eligible Bookings Queue ({eligibleBookings.length})</span>
        </button>
      </div>

      {/* TAB 1: ALLOTMENT RECORDS */}
      {activeTab === 'allotments' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '360px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search allotment #, booking #, customer, VIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '38px', width: '100%', height: '38px', fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status:</span>
              {['ALL', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn ${statusFilter === st ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.7rem' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ALLOTMENT REF</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER & BOOKING</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODEL & SPEC</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASSIGNED VEHICLES (VIN / ENGINE)</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Loading Allotments...
                    </td>
                  </tr>
                ) : filteredAllotments.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No allotment records found.
                    </td>
                  </tr>
                ) : (
                  filteredAllotments.map((a) => {
                    const activeLines = a.lines ? a.lines.filter((l) => l.isActive) : [];
                    const customerName = a.booking?.customer?.fullName || 'Customer';

                    return (
                      <tr key={a.allotmentId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                            {a.allotmentNumber}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                            {new Date(a.requestedAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{customerName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                            Booking: <span className="mono-code" style={{ fontSize: '0.7rem', color: 'var(--accent-indigo)' }}>{a.booking?.bookingNumber}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {a.booking?.item?.itemName || 'Product Model'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {a.booking?.item?.brand?.brandName || ''} {a.booking?.item?.model || ''}
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {activeLines.map((l) => (
                              <div
                                key={l.allotmentLineId}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-color)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.75rem',
                                }}
                              >
                                <span className="mono-code" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                                  VIN: {l.vehicleUnit?.chassisNumber}
                                </span>
                                <span style={{ color: 'var(--text-muted)' }}>|</span>
                                <span style={{ color: 'var(--text-secondary)' }}>ENG: {l.vehicleUnit?.engineNumber}</span>
                                {l.vehicleUnit?.currentWarehouse && (
                                  <span className="badge badge-indigo" style={{ fontSize: '0.62rem', marginLeft: 'auto' }}>
                                    <Building size={10} style={{ marginRight: '2px' }} />
                                    {l.vehicleUnit.currentWarehouse.warehouseName}
                                  </span>
                                )}
                              </div>
                            ))}
                            {activeLines.length === 0 && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                No active vehicle units (Deactivated/Reversed)
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              a.status === 'APPROVED'
                                ? 'badge-emerald'
                                : a.status === 'REQUESTED'
                                ? 'badge-amber'
                                : a.status === 'REJECTED'
                                ? 'badge-rose'
                                : 'badge-slate'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                            {a.status === 'REQUESTED' && (
                              <>
                                <button
                                  onClick={() => handleApproveAllotment(a.allotmentId)}
                                  disabled={actioningId === a.allotmentId}
                                  className="btn btn-cyan"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                >
                                  <Check size={13} />
                                  {actioningId === a.allotmentId ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => {
                                    setTargetAllotment(a);
                                    setRejectionReason('');
                                    setShowRejectModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {a.status === 'APPROVED' && (
                              <button
                                onClick={() => {
                                  setTargetAllotment(a);
                                  setShowReverseModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <RotateCcw size={13} />
                                Un-allot / Revert
                              </button>
                            )}

                            {a.status === 'REJECTED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ShieldAlert size={14} /> Rejected
                              </span>
                            )}

                            {a.status === 'CANCELLED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cancelled & Reverted</span>
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
      )}

      {/* TAB 2: ELIGIBLE BOOKINGS QUEUE */}
      {activeTab === 'queue' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Bookings Awaiting Vehicle Allocation
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Filtered by confirmed/settled advance deposit payments per KMSICAMS-2 business rules
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {eligibleBookings.length} order(s) eligible
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>BOOKING REF</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODEL</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ALLOTMENT PROGRESS</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DEPOSIT STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {eligibleBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No bookings currently pending allotment. All confirmed bookings are fully satisfied!
                    </td>
                  </tr>
                ) : (
                  eligibleBookings.map((b) => (
                    <tr key={b.bookingId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>{b.bookingNumber}</span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(b.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.customer?.fullName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Code: {b.customer?.customerCode}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {b.item?.itemName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Ordered: {b.quantity} unit(s)
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {b.allottedQuantity} of {b.requiredQuantity} Allotted
                          </span>
                          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                            {b.remainingQuantity} Needed
                          </span>
                        </div>
                        <div style={{ width: '120px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', margin: '0 auto', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${(b.allottedQuantity / b.requiredQuantity) * 100}%`,
                              height: '100%',
                              background: 'var(--accent-emerald)',
                              borderRadius: '3px',
                            }}
                          />
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> Deposit Verified
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                          ETB {Number(b.totalAmountDeposited).toLocaleString()}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenCreateModal(b.bookingId)}
                          className="btn btn-cyan"
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                        >
                          Allot Vehicles
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE ALLOTMENT REQUEST */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '720px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <Car size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    New Vehicle Allotment Request
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Allocate physical inventory units to confirmed customer orders
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAllotment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Booking Selection */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Eligible Booking *
                  </label>
                  <select
                    className="input"
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    required
                  >
                    <option value="">Select Confirmed Booking...</option>
                    {eligibleBookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingNumber} — {b.customer?.fullName} ({b.item?.itemName} · {b.remainingQuantity} needed)
                      </option>
                    ))}
                  </select>

                  {currentBooking && (
                    <div
                      style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Customer: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{currentBooking.customer?.fullName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Model: </span>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{currentBooking.item?.itemName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Deposit: </span>
                        <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Verified ✓</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Remaining Needed: </span>
                        <strong style={{ color: 'var(--accent-amber)', fontFamily: 'monospace' }}>{remainingNeeded} unit(s)</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidate Vehicle Units Picker */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Available Physical Vehicles in Stock *
                    </label>
                    <span style={{ fontSize: '0.75rem', color: selectedUnitIds.length === remainingNeeded ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      Selected: <strong>{selectedUnitIds.length}</strong> of <strong>{remainingNeeded}</strong> unit(s) max
                    </span>
                  </div>

                  {availableVehicles.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <AlertTriangle size={18} style={{ color: 'var(--accent-amber)', marginBottom: '0.35rem' }} />
                      <div>No physical vehicles in status <strong>AVAILABLE_FOR_SALE</strong> matching this model currently in stock.</div>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingRight: '0.25rem' }}>
                      {availableVehicles.map((u) => {
                        const isSelected = selectedUnitIds.includes(u.vehicleUnitId);
                        return (
                          <div
                            key={u.vehicleUnitId}
                            onClick={() => handleToggleUnitSelection(u.vehicleUnitId, remainingNeeded)}
                            style={{
                              padding: '0.65rem 0.85rem',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                              border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                              background: isSelected ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent onClick
                                style={{ cursor: 'pointer' }}
                              />
                              <div>
                                <span className="mono-code" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                                  VIN: {u.chassisNumber}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                  ENG: {u.engineNumber}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {u.currentWarehouse && (
                                <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                                  {u.currentWarehouse.warehouseName}
                                </span>
                              )}
                              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                                {u.currentStatus}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Allotment Notes (Optional)
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={allotmentNotes}
                    onChange={(e) => setAllotmentNotes(e.target.value)}
                    placeholder="e.g. Allocation requested for customer express delivery..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedBookingId || selectedUnitIds.length === 0}
                  className="btn btn-cyan"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Car size={16} />
                  {saving ? 'Creating...' : `Submit Request (${selectedUnitIds.length} Unit${selectedUnitIds.length === 1 ? '' : 's'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REJECT ALLOTMENT */}
      {showRejectModal && targetAllotment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                  Reject Allotment Request
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Allotment Ref: {targetAllotment.allotmentNumber}
                </span>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRejectAllotment}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mandatory Rejection Explanation *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this allotment is rejected (e.g. Vehicle units allocated for maintenance inspection)..."
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⚠️ Rejecting this request frees the selected physical vehicle units back for other customer bookings.
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowRejectModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !rejectionReason.trim()} className="btn btn-rose">
                  {saving ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REVERSE / UN-ALLOT ALLOTMENT */}
      {showReverseModal && targetAllotment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-amber)', margin: 0 }}>
                  Confirm Vehicle Un-Allotment / Reversal
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Allotment Ref: {targetAllotment.allotmentNumber}
                </span>
              </div>
              <button onClick={() => setShowReverseModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)' }}>
                  <RotateCcw size={22} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  Are you sure you want to reverse this approved allotment?
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    • The assigned vehicle units will immediately transition from <strong>ALLOTTED</strong> back to <strong>AVAILABLE_FOR_SALE</strong> in inventory.
                    <br />
                    • Allotment lines will be deactivated and status will be updated to <strong>CANCELLED</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowReverseModal(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReverseAllotment}
                disabled={saving}
                className="btn btn-secondary"
                style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)', fontWeight: 700 }}
              >
                {saving ? 'Reversing...' : 'Confirm Un-Allotment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
