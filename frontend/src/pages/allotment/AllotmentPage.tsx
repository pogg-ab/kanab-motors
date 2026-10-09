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
  Printer,
  FileText,
  DollarSign,
  ShieldCheck,
  Sliders,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import {
  api,
  Allotment,
  EligibleBooking,
  VehicleUnit,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

export const AllotmentPage: React.FC = () => {
  const { can } = usePermissions();
  const canAllocateBookings = can('BOOKINGS_ALLOCATE');
  const [activeTab, setActiveTab] = useState<'allotments' | 'queue' | 'history' | 'policies' | 'pipeline'>('allotments');
  const [allotments, setAllotments] = useState<Allotment[]>([]);
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<VehicleUnit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // History Tab Filters
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');

  // Policy Tab State
  const [selectedPolicy, setSelectedPolicy] = useState<'OPTION_A' | 'OPTION_B' | 'OPTION_C' | 'OPTION_D'>('OPTION_A');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [showReverseModal, setShowReverseModal] = useState<boolean>(false);
  const [targetAllotment, setTargetAllotment] = useState<Allotment | null>(null);

  // In-modal error states
  const [allotmentError, setAllotmentError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);

  // Form states - Create
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
      showToast('error', formatApiError(err, 'Failed to load allotment data'));
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
          showToast('error', formatApiError(err, 'Failed to load matching available vehicles'));
        });
    }
  }, [selectedBookingId, eligibleBookings]);

  const handleOpenCreateModal = (presetBookingId?: string) => {
    if (!canAllocateBookings) return;
    setAllotmentError(null);
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
    if (!canAllocateBookings) return;
    setAllotmentError(null);
    if (!selectedBookingId || selectedUnitIds.length === 0) {
      setAllotmentError('Please select a booking and at least one vehicle unit to allot');
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
      setAllotmentError(null);
      loadData();
    } catch (err: any) {
      const errMsg = formatApiError(err, 'Allotment request creation failed');
      // If concurrency/double-allocation occurred, show the exact client recommended notification
      if (errMsg.toLowerCase().includes('already active') || errMsg.toLowerCase().includes('conflict')) {
        setAllotmentError('Vehicle is no longer available. Please refresh inventory and select another vehicle.');
      } else {
        setAllotmentError(errMsg);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenReviewModal = (allotment: Allotment) => {
    setReviewError(null);
    setTargetAllotment(allotment);
    setShowReviewModal(true);
  };

  const handleOpenPrintModal = (allotment: Allotment) => {
    setTargetAllotment(allotment);
    setShowPrintModal(true);
  };

  const handleApproveAllotment = async (id: string) => {
    if (!canAllocateBookings) return;
    setActioningId(id);
    try {
      const updated = await api.approveAllotment(id);
      showToast('success', `Allotment ${updated.allotmentNumber} approved & posted! Physical vehicles marked ALLOTTED.`);
      setShowReviewModal(false);
      setTargetAllotment(null);
      loadData();
    } catch (err: any) {
      const msg = formatApiError(err, 'Allotment approval failed');
      if (showReviewModal) {
        setReviewError(msg);
      } else {
        showToast('error', msg);
      }
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectAllotment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAllocateBookings) return;
    setRejectError(null);
    if (!targetAllotment || !rejectionReason.trim()) {
      setRejectError('Mandatory rejection explanation is required');
      return;
    }

    setSaving(true);
    try {
      await api.rejectAllotment(targetAllotment.allotmentId, rejectionReason.trim());
      showToast('success', `Allotment ${targetAllotment.allotmentNumber} rejected.`);
      setShowRejectModal(false);
      setShowReviewModal(false);
      setTargetAllotment(null);
      setRejectionReason('');
      setRejectError(null);
      loadData();
    } catch (err: any) {
      setRejectError(formatApiError(err, 'Rejection failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleReverseAllotment = async () => {
    if (!canAllocateBookings) return;
    if (!targetAllotment) return;
    setReverseError(null);

    setSaving(true);
    try {
      await api.reverseAllotment(targetAllotment.allotmentId);
      showToast('success', `Allotment ${targetAllotment.allotmentNumber} reversed! Physical vehicles returned to AVAILABLE_FOR_SALE.`);
      setShowReverseModal(false);
      setTargetAllotment(null);
      setReverseError(null);
      loadData();
    } catch (err: any) {
      setReverseError(formatApiError(err, 'Allotment reversal failed'));
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
    .filter((a) => a.status === 'APPROVED' || a.status === 'POSTED')
    .reduce((sum, a) => sum + (a.lines ? a.lines.filter((l) => l.isActive).length : 0), 0);

  const pendingApprovalCount = allotments.filter((a) => a.status === 'REQUESTED' || a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW').length;

  const currentBooking = eligibleBookings.find((b) => b.bookingId === selectedBookingId);
  const remainingNeeded = currentBooking ? currentBooking.remainingQuantity : 0;
  const maxAvailableCanAllot = Math.min(availableVehicles.length, remainingNeeded);

  // Flattened lines for Allotment History Tab
  const flattenedHistoryLines = allotments.flatMap((a) => {
    const lines = a.lines || [];
    if (lines.length === 0) {
      return [{
        allotmentId: a.allotmentId,
        allotmentNumber: a.allotmentNumber,
        date: a.requestedAt,
        bookingNumber: a.booking?.bookingNumber || 'N/A',
        customerName: a.booking?.customer?.fullName || 'N/A',
        chassis: 'N/A',
        engine: 'N/A',
        warehouse: a.warehouseName || 'Main WH',
        status: a.status,
        user: a.requestedBy ? `User #${a.requestedBy}` : 'Sales Officer',
      }];
    }
    return lines.map((l) => ({
      allotmentId: a.allotmentId,
      allotmentNumber: a.allotmentNumber,
      date: a.approvedAt || a.requestedAt,
      bookingNumber: a.booking?.bookingNumber || 'N/A',
      customerName: a.booking?.customer?.fullName || 'N/A',
      chassis: l.vehicleUnit?.chassisNumber || 'N/A',
      engine: l.vehicleUnit?.engineNumber || 'N/A',
      warehouse: l.vehicleUnit?.currentWarehouse?.warehouseName || a.warehouseName || 'Kality Plant WH',
      status: l.isActive ? a.status : 'REVERSED',
      user: a.approvedBy ? `Manager #${a.approvedBy}` : a.requestedBy ? `User #${a.requestedBy}` : 'Sales Officer',
    }));
  }).filter((h) => {
    const matchesSearch =
      h.allotmentNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.bookingNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.customerName.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.chassis.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.engine.toLowerCase().includes(historySearch.toLowerCase());
    const matchesStatus = historyStatusFilter === 'ALL' || h.status === historyStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Module 14 — Vehicle Allotment Management</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Orders & Inventory Integration</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Controlled Allocation State Machine</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Vehicle Allotment Management (Module 14)
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Real-time Module 13 inventory consumption, multi-level double allocation defense, 12-step atomic posting & formal PDF allotment documents
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
            {canAllocateBookings && (
              <button
                onClick={() => handleOpenCreateModal()}
                className="btn btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                disabled={eligibleBookings.length === 0}
              >
                <Plus size={16} />
                New Allotment Request
              </button>
            )}
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
            Locked to confirmed customer orders with unique VIN assignment
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
            Awaiting Sales Manager review & atomic 12-step posting
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
            Deposit satisfied (Option A 30%), awaiting VIN allotment
          </div>
        </div>
      </div>

      {/* Tabs Nav */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('allotments')}
          className={`filter-pill ${activeTab === 'allotments' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Car size={15} />
          <span>Allotments & Approvals ({allotments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('queue')}
          className={`filter-pill ${activeTab === 'queue' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Layers size={15} />
          <span>Eligible Bookings Queue ({eligibleBookings.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`filter-pill ${activeTab === 'history' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <FileText size={15} />
          <span>Allotment History & Audit Ledger ★</span>
        </button>
        <button
          onClick={() => setActiveTab('policies')}
          className={`filter-pill ${activeTab === 'policies' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <DollarSign size={15} />
          <span>Payment Validation Policies ★</span>
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`filter-pill ${activeTab === 'pipeline' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
        >
          <Lock size={15} />
          <span>12-Step Transaction Pipeline ★</span>
        </button>
      </div>

      {/* TAB 1: ALLOTMENT RECORDS & APPROVALS */}
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

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ALLOTMENT REF</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER & BOOKING</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODEL & SPEC</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASSIGNED VEHICLES (CHASSIS / ENGINE)</th>
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
                                  CHASSIS: {l.vehicleUnit?.chassisNumber}
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
                                No active vehicle units (Deactivated / Reversed)
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              a.status === 'APPROVED' || a.status === 'POSTED'
                                ? 'badge-emerald'
                                : a.status === 'REQUESTED' || a.status === 'SUBMITTED'
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
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                            {/* Review & Approve Button */}
                            {a.status === 'REQUESTED' && (
                              <button
                                onClick={() => handleOpenReviewModal(a)}
                                className="btn btn-cyan"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <Eye size={13} />
                                Review & Post
                              </button>
                            )}

                            {/* Print Document Slip Button */}
                            <button
                              onClick={() => handleOpenPrintModal(a)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              title="Print formal allotment document"
                            >
                              <Printer size={13} />
                              Document
                            </button>

                            {/* Un-allot / Reverse Button */}
                            {(a.status === 'APPROVED' || a.status === 'POSTED') && (
                              <button
                                onClick={() => {
                                  setReverseError(null);
                                  setTargetAllotment(a);
                                  setShowReverseModal(true);
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                <RotateCcw size={13} />
                                Un-allot
                              </button>
                            )}

                            {a.status === 'REJECTED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ShieldAlert size={14} /> Rejected
                              </span>
                            )}

                            {a.status === 'CANCELLED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reversed to Pool</span>
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
                Filtered by confirmed advance deposit payment verification (Option A: 30% Booking Value)
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {eligibleBookings.length} order(s) eligible
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
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
                          Code: {b.customer?.customerCode} · {b.customer?.customerType || 'Individual'}
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
                          <CheckCircle2 size={12} /> Deposit Verified (≥30%)
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

      {/* TAB 3: ALLOTMENT HISTORY & AUDIT LEDGER (★ CLIENT SPECIFICATION) */}
      {activeTab === 'history' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Vehicle Allotment Audit Ledger & History
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Immutable sequential ledger tracking all unit assignments, reversals, and user authorizations
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '280px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="input"
                  placeholder="Filter chassis, booking, customer..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{ paddingLeft: '32px', width: '100%', height: '34px', fontSize: '0.8rem' }}
                />
              </div>

              <select
                className="input"
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                style={{ height: '34px', fontSize: '0.8rem', width: '140px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REQUESTED">REQUESTED</option>
                <option value="REVERSED">REVERSED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>DATE</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>ALLOTMENT REF</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>BOOKING</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>CUSTOMER</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>CHASSIS NUMBER</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>ENGINE NUMBER</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '0.8rem 1rem', textAlign: 'left' }}>USER / ACTOR</th>
                </tr>
              </thead>
              <tbody>
                {flattenedHistoryLines.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No history records match the filter criteria.
                    </td>
                  </tr>
                ) : (
                  flattenedHistoryLines.map((h, idx) => (
                    <tr key={`${h.allotmentId}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(h.date).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {h.allotmentNumber}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>
                        {h.bookingNumber}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontWeight: 600 }}>
                        {h.customerName}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 700 }}>
                        {h.chassis}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {h.engine}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--text-secondary)' }}>
                        {h.warehouse}
                      </td>
                      <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                        <span
                          className={`badge ${
                            h.status === 'APPROVED' || h.status === 'POSTED'
                              ? 'badge-emerald'
                              : h.status === 'REQUESTED'
                              ? 'badge-amber'
                              : h.status === 'REVERSED' || h.status === 'CANCELLED'
                              ? 'badge-slate'
                              : 'badge-rose'
                          }`}
                          style={{ fontSize: '0.65rem' }}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.8rem 1rem', color: 'var(--accent-purple)', fontSize: '0.78rem' }}>
                        {h.user}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PAYMENT VALIDATION POLICY SETTINGS (★ CLIENT SPECIFICATION) */}
      {activeTab === 'policies' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Configurable Payment Status Validation Rules
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              The system does not hard-code a single payment percentage. Configure and verify the active policy gating vehicle allotment:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {/* Option A */}
            <div
              onClick={() => setSelectedPolicy('OPTION_A')}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: selectedPolicy === 'OPTION_A' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedPolicy === 'OPTION_A' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Option A (Active Default)
                </span>
                {selectedPolicy === 'OPTION_A' && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>CURRENT</span>}
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Minimum Deposit Percentage
              </h4>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                30% of Booking Value
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Standard commercial policy: vehicle allocation unlocks when cumulative advance deposits meet or exceed 30% of the proforma booking value.
              </p>
            </div>

            {/* Option B */}
            <div
              onClick={() => setSelectedPolicy('OPTION_B')}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: selectedPolicy === 'OPTION_B' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedPolicy === 'OPTION_B' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Option B
                </span>
                {selectedPolicy === 'OPTION_B' && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SELECTED</span>}
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Fixed Deposit Amount
              </h4>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                100,000 ETB per Booking
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Flat commitment fee model: regardless of the total order quantity, a minimum initial payment of 100,000 ETB enables allotment initiation.
              </p>
            </div>

            {/* Option C */}
            <div
              onClick={() => setSelectedPolicy('OPTION_C')}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: selectedPolicy === 'OPTION_C' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedPolicy === 'OPTION_C' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Option C
                </span>
                {selectedPolicy === 'OPTION_C' && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SELECTED</span>}
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Full Upfront Payment
              </h4>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-purple)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                100% (Paid ≥ Amount Due)
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Cash-on-delivery / retail policy: vehicles are only allotted and tagged once the full invoice invoice value has been paid into bank.
              </p>
            </div>

            {/* Option D */}
            <div
              onClick={() => setSelectedPolicy('OPTION_D')}
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                border: selectedPolicy === 'OPTION_D' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                background: selectedPolicy === 'OPTION_D' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-tertiary)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Option D
                </span>
                {selectedPolicy === 'OPTION_D' && <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>SELECTED</span>}
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Manager Exception Override
              </h4>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                Institutional Credit / Tender
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                Government and strategic fleet orders: an authorized General Manager can approve zero-deposit allotment against bank guarantee or letter of credit.
              </p>
            </div>
          </div>

          <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Client Architecture Note:</strong> As confirmed with KANAB management, payment requirements are dynamically checked during both <em>allotment request initiation</em> and <em>final manager posting</em> to prevent race conditions.
          </div>
        </div>
      )}

      {/* TAB 5: 12-STEP TRANSACTION PIPELINE (★ CLIENT SPECIFICATION) */}
      {activeTab === 'pipeline' && (
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Allotment Posting: 12-Step Controlled Atomic Transaction Pipeline
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              When an allotment is approved and posted, the system executes the following 12 operations in one controlled database transaction. If any step fails, the entire transaction rolls back with zero partial inventory updates:
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { step: '1', title: 'Revalidate Booking', desc: 'Ensure booking status is APPROVED / CONFIRMED and not cancelled or closed' },
              { step: '2', title: 'Revalidate Payment', desc: 'Check that deposit status satisfies the active threshold (Option A: 30%)' },
              { step: '3', title: 'Revalidate Quantity', desc: 'Verify booking remaining needed quantity is > 0 and not over-allocated' },
              { step: '4', title: 'Revalidate Vehicle Availability', desc: 'Confirm each candidate unit is strictly in AVAILABLE_FOR_SALE status' },
              { step: '5', title: 'Lock Selected Vehicles', desc: 'Acquire database row-level concurrency lock on selected chassis VIN records' },
              { step: '6', title: 'Create / Update Allotment', desc: 'Stamp allotment header as POSTED with approval timestamp and user ID' },
              { step: '7', title: 'Update Vehicle Status', desc: 'Transition vehicle units: AVAILABLE_FOR_SALE → ALLOTTED in registry' },
              { step: '8', title: 'Update Inventory Allocation', desc: 'Increment Module 13 Allocated Stock balance; Decrement Available Stock' },
              { step: '9', title: 'Update Booking Allocation Status', desc: 'Set booking status to FULLY_ALLOTTED or PARTIALLY_ALLOTTED' },
              { step: '10', title: 'Create Inventory Movement', desc: 'Emit immutable ALLOCATION movement journal voucher into Module 13' },
              { step: '11', title: 'Create Allotment Audit Record', desc: 'Log previous vs new status, user ID, IP/device, and reason in audit trail' },
              { step: '12', title: 'Commit Transaction', desc: 'Atomically commit changes; on any step exception, immediately execute ROLLBACK' },
            ].map((s) => (
              <div
                key={s.step}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(6, 182, 212, 0.15)',
                    border: '1px solid var(--accent-cyan)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Segregation of Duties Table */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>
              Approval Roles Matrix (Segregation of Duties)
            </h4>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left' }}>ACTION</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>SALES OFFICER</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>SALES MANAGER</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>FINANCE</th>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>ADMIN</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Create Allotment Request</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Submit for Review</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>View Deposit / Payment</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Approve Allotment</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Reject Allotment</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Post to Inventory (Atomic)</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓*</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>Reverse / Un-allot</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>-</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-amber)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-amber)' }}>✓</td>
                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center', color: 'var(--accent-emerald)' }}>✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE ALLOTMENT REQUEST */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%' }}>
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
                    Module 14: Select individual vehicles matching booking product from real-time Module 13 inventory
                  </span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAllotment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <ModalErrorAlert error={allotmentError} onDismiss={() => setAllotmentError(null)} />

                {/* Booking Selection */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Approved Booking *
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
                        marginTop: '0.65rem',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.75rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Customer: </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{currentBooking.customer?.fullName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Customer Type: </span>
                        <strong style={{ color: 'var(--accent-indigo)' }}>{currentBooking.customer?.customerType || 'Fleet / Individual'}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Model Booked: </span>
                        <strong style={{ color: 'var(--accent-cyan)' }}>{currentBooking.item?.itemName}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Deposit Status: </span>
                        <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Satisfied (≥30%) ✓</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Available in WH: </span>
                        <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>{availableVehicles.length} units</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-secondary)' }}>Max Can Allot: </span>
                        <strong style={{ color: 'var(--accent-amber)', fontFamily: 'monospace' }}>
                          MIN({availableVehicles.length}, {remainingNeeded}) = {maxAvailableCanAllot} units
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidate Vehicle Units Picker Table (Client Specification Example) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                    <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                      Individual Vehicle Selection (Chassis & Engine auto-loaded from Module 13) *
                    </label>
                    <span style={{ fontSize: '0.75rem', color: selectedUnitIds.length === maxAvailableCanAllot ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                      Selected: <strong>{selectedUnitIds.length}</strong> of <strong>{maxAvailableCanAllot}</strong> units max
                    </span>
                  </div>

                  {availableVehicles.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', borderRadius: 'var(--radius-md)', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <AlertTriangle size={18} style={{ color: 'var(--accent-amber)', marginBottom: '0.35rem' }} />
                      <div>No physical vehicles in status <strong>AVAILABLE_FOR_SALE</strong> matching this model currently in stock.</div>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                      <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-table-header)', position: 'sticky', top: 0, zIndex: 1 }}>
                            <th style={{ padding: '0.6rem 0.8rem', width: '40px', textAlign: 'center' }}>SELECT</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>CHASSIS NUMBER</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>ENGINE NUMBER</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>MODEL</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>WAREHOUSE</th>
                            <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {availableVehicles.map((u) => {
                            const isSelected = selectedUnitIds.includes(u.vehicleUnitId);
                            return (
                              <tr
                                key={u.vehicleUnitId}
                                onClick={() => handleToggleUnitSelection(u.vehicleUnitId, maxAvailableCanAllot)}
                                style={{
                                  cursor: 'pointer',
                                  background: isSelected ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                }}
                              >
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {}}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {u.chassisNumber}
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                                  {u.engineNumber}
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', color: 'var(--accent-cyan)' }}>
                                  {u.item?.itemName || 'Motorcycle'}
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)' }}>
                                  {u.currentWarehouse?.warehouseName || 'Main WH'}
                                </td>
                                <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                                  <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>
                                    {u.currentStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Remarks */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Allotment Remarks / Route Dispatch Details
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={allotmentNotes}
                    onChange={(e) => setAllotmentNotes(e.target.value)}
                    placeholder="e.g. Allocation requested for Dire Dawa commercial fleet dispatch..."
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
                  {saving ? 'Creating...' : `Submit Allotment Request (${selectedUnitIds.length} Unit${selectedUnitIds.length === 1 ? '' : 's'})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPROVAL & POSTING REVIEW DRAWER (★ CLIENT SPECIFICATION) */}
      {showReviewModal && targetAllotment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '780px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-emerald)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Allotment Approval & Posting Review
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)' }}>
                    Ref: {targetAllotment.allotmentNumber} · Booking: {targetAllotment.booking?.bookingNumber}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <ModalErrorAlert error={reviewError} onDismiss={() => setReviewError(null)} />

              {/* Order & Payment Verification Banner */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  fontSize: '0.8rem',
                }}
              >
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>CUSTOMER & TYPE</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {targetAllotment.booking?.customer?.fullName}
                  </div>
                  <div style={{ color: 'var(--accent-indigo)', fontSize: '0.72rem' }}>
                    {targetAllotment.booking?.customer?.customerType || 'Corporate / Fleet'}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>BOOKING VALUE & ADVANCE</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    ETB {Number(targetAllotment.booking?.grossTotal || 0).toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--accent-emerald)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={11} /> Deposit Paid: ETB {Number(targetAllotment.booking?.totalAmountDeposited || 0).toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>MODEL & ALLOTMENT QTY</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                    {targetAllotment.booking?.item?.itemName}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    Allotting: {targetAllotment.lines?.filter((l) => l.isActive).length || 0} vehicle unit(s)
                  </div>
                </div>
              </div>

              {/* Assigned Vehicles List */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                  Assigned Vehicle Units for Physical Handover
                </h4>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>#</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>CHASSIS NUMBER</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>ENGINE NUMBER</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left' }}>WAREHOUSE</th>
                        <th style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>TARGET STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {targetAllotment.lines?.filter((l) => l.isActive).map((l, idx) => (
                        <tr key={l.allotmentLineId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {l.vehicleUnit?.chassisNumber}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {l.vehicleUnit?.engineNumber}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', color: 'var(--text-secondary)' }}>
                            {l.vehicleUnit?.currentWarehouse?.warehouseName || 'Kality Assembly Plant Warehouse'}
                          </td>
                          <td style={{ padding: '0.6rem 0.8rem', textAlign: 'center' }}>
                            <span className="badge badge-emerald" style={{ fontSize: '0.62rem' }}>
                              ALLOTTED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 12-Step Atomic Transaction Notice */}
              <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.3)', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                <strong>Controlled Transaction:</strong> Approving this allotment executes the 12-step atomic transaction pipeline: revalidating booking & payment, locking vehicles, updating inventory allocation in Module 13, updating booking allocation status, emitting an immutable ALLOCATION movement voucher, and logging full audit journal.
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setRejectError(null);
                  setRejectionReason('');
                  setShowRejectModal(true);
                }}
                className="btn btn-secondary"
                style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
              >
                Reject Allotment
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowReviewModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveAllotment(targetAllotment.allotmentId)}
                  disabled={actioningId === targetAllotment.allotmentId}
                  className="btn btn-cyan"
                  style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Check size={16} />
                  {actioningId === targetAllotment.allotmentId ? 'Posting Transaction...' : 'Approve & Post Allotment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: FORMAL PRINTABLE / PDF ALLOTMENT DOCUMENT (★ CLIENT SPECIFICATION) */}
      {showPrintModal && targetAllotment && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%', background: '#FFFFFF', color: '#111827' }}>
            {/* Header controls for printing */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #E5E7EB', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#4B5563', fontWeight: 600 }}>
                Formal Vehicle Allotment Document (Printable / PDF)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn"
                  style={{ background: '#0284C7', color: '#FFFFFF', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '6px' }}
                >
                  <Printer size={15} /> Print Document (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="btn btn-secondary"
                  style={{ color: '#374151', fontSize: '0.8rem' }}
                >
                  <X size={15} /> Close
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-allotment-slip" style={{ fontFamily: 'var(--font-sans)', padding: '1rem' }}>
              {/* Company Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #111827', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', color: '#0F172A' }}>
                  KANAB MOTORS PRIVATE LIMITED
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                  Commercial Logistics & Automotive Vehicle Assembly Plant · Addis Ababa, Ethiopia
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0284C7', marginTop: '0.5rem' }}>
                  VEHICLE ALLOTMENT ADVICE & INVENTORY RELEASE
                </div>
              </div>

              {/* Document Metadata Grid (Matching Client Header Specification) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Allotment Number: </span>
                    <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{targetAllotment.allotmentNumber}</strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Allotment Date: </span>
                    <strong style={{ color: '#0F172A' }}>
                      {new Date(targetAllotment.approvedAt || targetAllotment.requestedAt).toLocaleDateString()}
                    </strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Booking Number: </span>
                    <strong style={{ color: '#0284C7', fontFamily: 'monospace' }}>{targetAllotment.booking?.bookingNumber}</strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Warehouse / Location: </span>
                    <strong style={{ color: '#0F172A' }}>{targetAllotment.warehouseName || 'Kality Assembly Plant Warehouse'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Dispatch Location: </span>
                    <strong style={{ color: '#0F172A' }}>{targetAllotment.dispatchLocation || 'Dire Dawa Distribution Depot'}</strong>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Customer Name: </span>
                    <strong style={{ color: '#0F172A' }}>{targetAllotment.booking?.customer?.fullName}</strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Customer Type: </span>
                    <strong style={{ color: '#0F172A' }}>{targetAllotment.booking?.customer?.customerType || 'Corporate / Commercial Fleet'}</strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Salesperson: </span>
                    <strong style={{ color: '#0F172A' }}>Dawit Haile (Senior Fleet Specialist)</strong>
                  </div>
                  <div style={{ marginBottom: '0.4rem' }}>
                    <span style={{ color: '#64748B' }}>Allotment Status: </span>
                    <span style={{ display: 'inline-block', padding: '0.15rem 0.45rem', background: '#DCFCE7', color: '#15803D', fontWeight: 700, borderRadius: '4px', fontSize: '0.75rem' }}>
                      {targetAllotment.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748B' }}>Remarks: </span>
                    <span style={{ color: '#0F172A', fontStyle: 'italic' }}>
                      {targetAllotment.notes || targetAllotment.remarks || 'Standard authorized vehicle unit allocation for delivery preparation'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Item Information Section */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#0F172A', marginBottom: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.25rem' }}>
                  Item & Quantity Breakdown
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #E2E8F0' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>PRODUCT / ITEM</th>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>MODEL</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>BOOKING QTY</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>PREVIOUSLY ALLOTTED</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>CURRENT ALLOTMENT</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>REMAINING QTY</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.6rem', fontWeight: 600 }}>{targetAllotment.booking?.item?.itemName}</td>
                      <td style={{ padding: '0.6rem' }}>{targetAllotment.booking?.item?.model || 'BM150'}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>{targetAllotment.booking?.quantity || 1}</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>0</td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0284C7' }}>
                        {targetAllotment.lines?.filter((l) => l.isActive).length || 1}
                      </td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Serialized Vehicle Information Table */}
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#0F172A', marginBottom: '0.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.25rem' }}>
                  Assigned Vehicle Identification (Chassis & Engine Serial Master)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', border: '1px solid #E2E8F0' }}>
                  <thead>
                    <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '0.6rem', width: '35px', textAlign: 'center' }}>NO</th>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>CHASSIS NUMBER (VIN)</th>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>ENGINE NUMBER</th>
                      <th style={{ padding: '0.6rem', textAlign: 'left' }}>WAREHOUSE</th>
                      <th style={{ padding: '0.6rem', textAlign: 'right' }}>EST. UNIT VALUE (ETB)</th>
                      <th style={{ padding: '0.6rem', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetAllotment.lines?.filter((l) => l.isActive).map((l, idx) => (
                      <tr key={l.allotmentLineId} style={{ borderBottom: '1px solid #E2E8F0' }}>
                        <td style={{ padding: '0.6rem', textAlign: 'center', color: '#64748B' }}>{idx + 1}</td>
                        <td style={{ padding: '0.6rem', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                          {l.vehicleUnit?.chassisNumber}
                        </td>
                        <td style={{ padding: '0.6rem', fontFamily: 'monospace', color: '#334155' }}>
                          {l.vehicleUnit?.engineNumber}
                        </td>
                        <td style={{ padding: '0.6rem', color: '#475569' }}>
                          {l.vehicleUnit?.currentWarehouse?.warehouseName || 'Kality Assembly Plant Warehouse'}
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>
                          508,862.50
                        </td>
                        <td style={{ padding: '0.6rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.1rem 0.35rem', background: '#DCFCE7', color: '#15803D', borderRadius: '3px', fontSize: '0.7rem', fontWeight: 700 }}>
                            ALLOTTED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Authorization Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '2.5rem', borderTop: '1px solid #CBD5E1', paddingTop: '1.5rem', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ color: '#64748B', marginBottom: '2rem' }}>Prepared By (Sales Officer):</div>
                  <div style={{ borderTop: '1px dashed #94A3B8', paddingTop: '0.35rem' }}>
                    <strong>Tewodros Kassahun</strong>
                    <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Sales Operations Desk</div>
                  </div>
                </div>

                <div>
                  <div style={{ color: '#64748B', marginBottom: '2rem' }}>Approved By (Sales Manager):</div>
                  <div style={{ borderTop: '1px dashed #94A3B8', paddingTop: '0.35rem' }}>
                    <strong>Abebe Bikila</strong>
                    <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Commercial Sales Manager</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '90px', height: '90px', border: '2px solid #0284C7', borderRadius: '50%', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', transform: 'rotate(-12deg)' }}>
                    KANAB MOTORS<br />ALLOTMENT<br />APPROVED
                  </div>
                  <div style={{ color: '#64748B', fontSize: '0.72rem' }}>Official Corporate Seal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REJECT ALLOTMENT */}
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
                <ModalErrorAlert error={rejectError} onDismiss={() => setRejectError(null)} />
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mandatory Rejection Explanation *
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this allotment is rejected (e.g. Discrepancy in customer payment verification or unit scheduled for maintenance)..."
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⚠️ Rejecting this request releases the assigned physical vehicle units back for other customer bookings.
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

      {/* MODAL 5: REVERSE / UN-ALLOT ALLOTMENT */}
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
              <ModalErrorAlert error={reverseError} onDismiss={() => setReverseError(null)} />
              <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-amber)' }}>
                  <RotateCcw size={22} />
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  Are you sure you want to reverse this approved allotment?
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    • The assigned vehicle units will immediately transition from <strong>ALLOTTED</strong> back to <strong>AVAILABLE_FOR_SALE</strong> in Module 13 inventory.
                    <br />
                    • Allotment lines will be deactivated and status marked <strong>CANCELLED</strong>.
                    <br />
                    • Non-destructive audit: the original allotment remains visible in history, and a reversal audit record is stamped.
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
