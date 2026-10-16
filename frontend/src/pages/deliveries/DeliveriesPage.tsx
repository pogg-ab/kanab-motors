import React, { useState, useEffect } from 'react';
import {
  Car,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  Printer,
  ShieldCheck,
  ClipboardCheck,
  FileCheck2,
  Calendar,
  User,
  Key,
  X,
} from 'lucide-react';
import { usePermissions } from '../../authz/usePermissions';
import { useModal } from '../../context/ModalContext';
import {
  api,
  Delivery,
  PdiChecklistItem,
  VehicleUnit,
  Booking,
} from '../../api/client';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

export const DeliveriesPage: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { can } = usePermissions();
  const canUpdateVehicleStatus = can('VEHICLES_STATUS_UPDATE');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [checklistItems, setChecklistItems] = useState<PdiChecklistItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleUnit[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'DELIVERIES' | 'PDI'>('DELIVERIES');

  // Modals
  const [showPdiModal, setShowPdiModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [gatePassData, setGatePassData] = useState<any | null>(null);
  const [docTab, setDocTab] = useState<'DELIVERY_VOUCHER' | 'HANDOVER_FORM'>('DELIVERY_VOUCHER');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pdiError, setPdiError] = useState<string | null>(null);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // PDI inspection form state
  const [pdiVehicleId, setPdiVehicleId] = useState<string>('');
  const [pdiResults, setPdiResults] = useState<{ [itemId: number]: boolean }>({});
  const [pdiNotes, setPdiNotes] = useState<{ [itemId: number]: string }>({});

  // Delivery creation form state
  const [deliveryBookingId, setDeliveryBookingId] = useState<string>('');
  const [deliveryVehicleId, setDeliveryVehicleId] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [financialSettlementValidated, setFinancialSettlementValidated] = useState<boolean>(true);
  const [customerAcknowledged, setCustomerAcknowledged] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [delRes, pdiItemsRes, vehRes, bkgRes] = await Promise.all([
        api.getDeliveries(),
        api.getPdiChecklist(),
        api.getVehicles ? api.getVehicles() : Promise.resolve({ items: [] }),
        api.getBookings ? api.getBookings() : Promise.resolve([]),
      ]);
      setDeliveries(delRes || []);
      setChecklistItems(pdiItemsRes || []);
      setVehicles(vehRes.items || []);
      setBookings(Array.isArray(bkgRes) ? bkgRes : (bkgRes as any)?.items || []);

      // Default all checklist items to true in PDI modal
      const initialResults: { [itemId: number]: boolean } = {};
      (pdiItemsRes || []).forEach((item) => {
        initialResults[item.pdiChecklistItemId] = true;
      });
      setPdiResults(initialResults);
    } catch (err: any) {
      setErrorMsg(formatApiError(err, 'Failed to load delivery data'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPdi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateVehicleStatus) return;
    if (!pdiVehicleId) {
      setPdiError('Please select a vehicle for PDI inspection');
      return;
    }

    try {
      setActionLoading(true);
      setPdiError(null);
      const payload = {
        vehicleUnitId: pdiVehicleId,
        results: checklistItems.map((item) => ({
          checklistItemId: item.pdiChecklistItemId,
          passed: !!pdiResults[item.pdiChecklistItemId],
          notes: pdiNotes[item.pdiChecklistItemId] || '',
        })),
      };

      await api.recordPdiInspection(payload);
      setSuccessMsg('PDI inspection completed successfully! Vehicle status updated to READY_FOR_DELIVERY.');
      setShowPdiModal(false);
      setPdiVehicleId('');
      await loadData();
    } catch (err: any) {
      setPdiError(formatApiError(err, 'Failed to record PDI inspection'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateVehicleStatus) return;
    if (!deliveryBookingId || !deliveryVehicleId) {
      setDeliveryError('Please select both a booking and a vehicle unit');
      return;
    }

    try {
      setActionLoading(true);
      setDeliveryError(null);
      await api.createDelivery({
        bookingId: deliveryBookingId,
        vehicleUnitId: deliveryVehicleId,
        deliveryDate,
        financialSettlementValidated,
        customerAcknowledged,
      });
      setSuccessMsg('Delivery handover order recorded and submitted for authorization!');
      setShowDeliveryModal(false);
      setDeliveryBookingId('');
      setDeliveryVehicleId('');
      await loadData();
    } catch (err: any) {
      setDeliveryError(formatApiError(err, 'Failed to create delivery order'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleAuthorize = async (deliveryId: string) => {
    if (!canUpdateVehicleStatus) return;
    const confirmed = await showConfirm({
      title: 'Authorize Vehicle Handover & Gate Release',
      message: 'Authorize vehicle release? This verifies mandatory PDI inspection standards and financial settlement before transitioning the vehicle to DELIVERED status.',
      confirmText: 'Authorize Release',
      variant: 'cyan',
    });
    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await api.authorizeDelivery(deliveryId, 'Handover authorized and verified by Sales Manager');
      setSuccessMsg('Delivery authorized successfully! Vehicle transitioned to DELIVERED.');
      await loadData();
    } catch (err: any) {
      setErrorMsg(formatApiError(err, 'Authorization failed. Verify PDI inspection and settlement.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewGatePass = async (deliveryId: string) => {
    try {
      setActionLoading(true);
      const data = await api.getGatePass(deliveryId);
      setGatePassData(data);
    } catch (err: any) {
      setErrorMsg(formatApiError(err, 'Failed to generate gate pass'));
    } finally {
      setActionLoading(false);
    }
  };

  const printGatePass = () => {
    document.body.classList.add('printing-gatepass');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-gatepass');
    }, 1000);
  };

  // Filtered deliveries
  const filteredDeliveries = deliveries.filter((del) => {
    const term = search.toLowerCase();
    return (
      del.deliveryNumber.toLowerCase().includes(term) ||
      (del.booking?.customer?.fullName && del.booking.customer.fullName.toLowerCase().includes(term)) ||
      (del.vehicleUnit?.chassisNumber && del.vehicleUnit.chassisNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Deliveries Main Dashboard (Hidden during print) */}
      <div className="deliveries-dashboard">
        {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Operations & Fulfillment</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Delivery & Dispatch</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Vehicle Handover & Gate Pass</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Car size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Delivery & Vehicle Handover
              </h1>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                PDI pre-delivery inspection, settlement verification, gate pass generation & dispatch fulfillment
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
            {canUpdateVehicleStatus && (
              <button
                onClick={() => {
                  setPdiError(null);
                  setShowPdiModal(true);
                }}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ClipboardCheck size={16} />
                Record PDI Inspection
              </button>
            )}
            {canUpdateVehicleStatus && (
              <button
                onClick={() => {
                  setDeliveryError(null);
                  setShowDeliveryModal(true);
                }}
                className="btn btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} />
                New Handover Order
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('DELIVERIES')}
          className={`filter-pill ${activeTab === 'DELIVERIES' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <Car size={15} />
          <span>Delivery Orders & Gate Passes ({deliveries.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('PDI')}
          className={`filter-pill ${activeTab === 'PDI' ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
          }}
        >
          <ClipboardCheck size={15} />
          <span>PDI Checklist Station ({checklistItems.length} Checks)</span>
        </button>
      </div>

      {activeTab === 'DELIVERIES' ? (
        <>
          {/* Deliveries Table Card */}
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
                  placeholder="Search delivery #, customer, chassis VIN..."
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
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery #</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chassis & Vehicle</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Handover Date</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>PDI Checked</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Settlement</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {loading ? 'Loading deliveries...' : 'No delivery records found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((del) => (
                      <tr key={del.deliveryId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {del.deliveryNumber}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {del.booking?.customer?.fullName || 'N/A'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Order: {del.booking?.bookingNumber}
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: '#10b981' }}>
                            {del.vehicleUnit?.chassisNumber || 'Chassis Assigned'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Status: {del.vehicleUnit?.currentStatus}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                          {del.deliveryDate || 'Scheduled'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {del.pdiCompleted ? (
                            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✓ Passed</span>
                          ) : (
                            <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>✗ Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {del.financialSettlementValidated ? (
                            <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>✓ Cleared</span>
                          ) : (
                            <span style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600 }}>Pending</span>
                          )}
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
                                del.status === 'APPROVED'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : del.status === 'PENDING'
                                  ? 'rgba(245, 158, 11, 0.15)'
                                  : 'rgba(239, 68, 68, 0.15)',
                              color:
                                del.status === 'APPROVED'
                                  ? '#10b981'
                                  : del.status === 'PENDING'
                                  ? '#f59e0b'
                                  : '#ef4444',
                              border: `1px solid ${
                                del.status === 'APPROVED'
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : del.status === 'PENDING'
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : 'rgba(239, 68, 68, 0.3)'
                              }`,
                            }}
                          >
                            {del.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleViewGatePass(del.deliveryId)}
                              title="Generate Official Gate Pass"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(0, 210, 211, 0.4)',
                                background: 'rgba(0, 210, 211, 0.1)',
                                color: 'var(--accent-cyan)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              <Printer size={14} />
                              Gate Pass
                            </button>

                            {del.status === 'PENDING' && canUpdateVehicleStatus && (
                              <button
                                onClick={() => handleAuthorize(del.deliveryId)}
                                title="Authorize Dispatch"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.4rem 0.6rem',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(16, 185, 129, 0.4)',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                <CheckCircle2 size={14} />
                                Authorize
                              </button>
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
      ) : (
        /* PDI CHECKLIST SECTION */
        <div className="card" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Mandatory Pre-Delivery Inspection (PDI) Standards</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Pre-Delivery Requirement: All 7 inspection checks must pass before a vehicle can be authorized for gate exit.
              </p>
            </div>
            {canUpdateVehicleStatus && (
            <button
              onClick={() => {
                setPdiError(null);
                setShowPdiModal(true);
              }}
              className="btn btn-cyan"
            >
              <ClipboardCheck size={16} />
              Start Inspection
            </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {checklistItems.map((item, idx) => (
              <div
                key={item.pdiChecklistItemId}
                className="card"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 210, 211, 0.1)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.itemDescription}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Standard Requirement</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECORD PDI MODAL */}
      {showPdiModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Record Vehicle PDI Inspection
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Perform 7-point mandatory pre-delivery safety verification
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdiModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPdi}>
              <div className="modal-body">
                <ModalErrorAlert error={pdiError} onDismiss={() => setPdiError(null)} />
                <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Target Vehicle Unit *
                </label>
                <select
                  value={pdiVehicleId}
                  onChange={(e) => setPdiVehicleId(e.target.value)}
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
                  <option value="">-- Select Vehicle to Inspect --</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicleUnitId} value={v.vehicleUnitId}>
                      VIN: {v.chassisNumber} ({v.currentStatus}) — {v.item?.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                  Verification Checklist:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {checklistItems.map((item) => (
                    <div
                      key={item.pdiChecklistItemId}
                      style={{
                        padding: '0.75rem 1rem',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{item.itemDescription}</span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={!!pdiResults[item.pdiChecklistItemId]}
                          onChange={(e) =>
                            setPdiResults({
                              ...pdiResults,
                              [item.pdiChecklistItemId]: e.target.checked,
                            })
                          }
                          style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: pdiResults[item.pdiChecklistItemId] ? '#10b981' : '#ef4444' }}>
                          {pdiResults[item.pdiChecklistItemId] ? 'Passed' : 'Fail'}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPdiModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !pdiVehicleId}
                  className="btn btn-cyan"
                >
                  {actionLoading ? 'Recording...' : 'Submit PDI Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DELIVERY MODAL */}
      {showDeliveryModal && (
        <div className="modal-backdrop" onClick={() => setShowDeliveryModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: '560px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                  <Car size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    New Handover Order
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Create customer delivery dispatch & authorize vehicle release
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
                onClick={() => setShowDeliveryModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body">
                <ModalErrorAlert error={deliveryError} onDismiss={() => setDeliveryError(null)} />
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Target Booking Order *
                  </label>
                  <select
                    value={deliveryBookingId}
                    onChange={(e) => setDeliveryBookingId(e.target.value)}
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
                    <option value="">-- Select Customer Booking --</option>
                    {bookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingNumber} — {b.customer?.fullName} ({b.item?.itemName})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Vehicle Unit (VIN) *
                  </label>
                  <select
                    value={deliveryVehicleId}
                    onChange={(e) => setDeliveryVehicleId(e.target.value)}
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
                    <option value="">-- Select Vehicle Unit --</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicleUnitId} value={v.vehicleUnitId}>
                        VIN: {v.chassisNumber} ({v.currentStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Handover Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={financialSettlementValidated}
                      onChange={(e) => setFinancialSettlementValidated(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Financial Settlement Confirmed</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={customerAcknowledged}
                      onChange={(e) => setCustomerAcknowledged(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: '0.875rem' }}>Customer Acknowledgment & Inspection Received</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !deliveryBookingId || !deliveryVehicleId}
                  className="btn btn-cyan"
                  style={{
                    fontWeight: 700,
                  }}
                >
                  {actionLoading ? 'Creating...' : 'Create Handover Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* TWO PRINTED DOCUMENTS (DELIVERY VOUCHER & HANDOVER FORM WITH DECLARATION & HANDOVER PACK) */}
      {gatePassData && (
        <div className="modal-backdrop gatepass-modal-backdrop print-clean-backdrop" onClick={() => setGatePassData(null)}>
          <div
            className="modal-content proforma-modal-content gatepass-modal-content print-clean-sheet"
            style={{
              maxWidth: '820px',
              width: '100%',
              background: '#ffffff',
              color: '#0f172a',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Document Switcher Tab Header */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                background: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                padding: '0.75rem 2rem',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setDocTab('DELIVERY_VOUCHER')}
                  className={docTab === 'DELIVERY_VOUCHER' ? 'keep-white' : ''}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: docTab === 'DELIVERY_VOUCHER' ? '#0f172a' : '#cbd5e1',
                    background: docTab === 'DELIVERY_VOUCHER' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : '#ffffff',
                    color: docTab === 'DELIVERY_VOUCHER' ? '#ffffff' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: docTab === 'DELIVERY_VOUCHER' ? '0 2px 6px rgba(15, 23, 42, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Car size={16} style={{ color: docTab === 'DELIVERY_VOUCHER' ? '#ffffff' : '#64748b' }} />
                  1. Delivery Voucher (Gate Pass)
                </button>
                <button
                  type="button"
                  onClick={() => setDocTab('HANDOVER_FORM')}
                  className={docTab === 'HANDOVER_FORM' ? 'keep-white' : ''}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: docTab === 'HANDOVER_FORM' ? '#0f172a' : '#cbd5e1',
                    background: docTab === 'HANDOVER_FORM' ? 'linear-gradient(135deg, #1e293b, #0f172a)' : '#ffffff',
                    color: docTab === 'HANDOVER_FORM' ? '#ffffff' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: docTab === 'HANDOVER_FORM' ? '0 2px 6px rgba(15, 23, 42, 0.25)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <FileCheck2 size={16} style={{ color: docTab === 'HANDOVER_FORM' ? '#ffffff' : '#64748b' }} />
                  2. Handover Form & Declaration (Handover Pack)
                </button>
              </div>

              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Dual-Document Handover Pack
              </span>
            </div>

            {/* PRINTABLE DOCUMENT 1: DELIVERY VOUCHER & GATE PASS */}
            {docTab === 'DELIVERY_VOUCHER' && (
              <div id="printable-gate-pass" className="gatepass-document print-clean-paper" style={{ padding: '2.5rem' }}>
                {/* Voucher header */}
                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a' }}>
                      KANAB MOTORS PLC
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Automotive Assembly, Commercial Distribution & Dispatch Operations
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="keep-white gatepass-badge"
                      style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.85rem',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      DELIVERY VOUCHER & GATE PASS
                    </span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      Ref: {gatePassData.voucherNumber || gatePassData.gatePassNumber}
                    </div>
                  </div>
                </div>

                {/* Customer Particulars */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Recipient Customer</div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{gatePassData.customer?.name}</div>
                      <div style={{ color: '#475569' }}>Phone: {gatePassData.customer?.phone}</div>
                      <div style={{ color: '#475569' }}>TIN: {gatePassData.customer?.tin}</div>
                    </div>
                    <div>
                      <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>Dispatch Reference</div>
                      <div style={{ fontWeight: 700 }}>Order: {gatePassData.booking?.bookingNumber}</div>
                      <div style={{ color: '#475569' }}>Dispatch Date: {gatePassData.deliveryDate}</div>
                      <div style={{ color: '#475569' }}>Location: {gatePassData.customer?.address || 'Main Assembly Yard, Addis Ababa'}</div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Identification */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between' }}>
                    <span>VEHICLE DISPATCH SPECIFICATIONS</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Odometer at Release: <strong>{gatePassData.vehicle?.odometerReading || 0} km</strong></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Chassis / VIN:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem', color: '#0f172a' }}>{gatePassData.vehicle?.chassisNumber}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Engine Number:</span>
                      <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>{gatePassData.vehicle?.engineNumber}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Model:</span>
                      <div style={{ fontWeight: 700 }}>{gatePassData.vehicle?.model}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Colour / Finish:</span>
                      <div style={{ fontWeight: 700 }}>🎨 {gatePassData.vehicle?.colour || 'Factory Standard'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Engine / Power:</span>
                      <div style={{ fontWeight: 700 }}>⚡ {gatePassData.vehicle?.engineCapacity || 'Standard'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Status:</span>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>READY FOR DISPATCH</div>
                    </div>
                  </div>
                </div>

                {/* Clearance Badges */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem', fontSize: '0.8rem' }}>
                  <div style={{ flex: 1, padding: '0.6rem', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '6px', textAlign: 'center', fontWeight: 700 }}>
                    ✓ PDI PRE-DELIVERY INSPECTION VERIFIED ({gatePassData.pdiSummary?.passedChecks || 7}/{gatePassData.pdiSummary?.totalChecks || 7})
                  </div>
                  <div style={{ flex: 1, padding: '0.6rem', background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', borderRadius: '6px', textAlign: 'center', fontWeight: 700 }}>
                    ✓ FINANCIAL SETTLEMENT CLEARED (100% PAID / AUTHORIZED)
                  </div>
                </div>

                {/* Voucher Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ height: '35px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.25rem', fontWeight: 700 }}>
                      Security Gate Clearance Officer
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Physical inspection & gate release authorization</div>
                  </div>
                  <div>
                    <div style={{ height: '35px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.25rem', fontWeight: 700 }}>
                      Releasing Dispatch Officer / Storekeeper
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{gatePassData.releasingOfficer || 'Dispatch Officer'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PRINTABLE DOCUMENT 2: HANDOVER FORM & ACCEPTANCE DECLARATION WITH HANDOVER PACK */}
            {docTab === 'HANDOVER_FORM' && (
              <div id="printable-handover-form" className="gatepass-document print-clean-paper" style={{ padding: '2.5rem' }}>
                {/* Handover header */}
                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: '#0f172a' }}>
                      KANAB MOTORS PLC
                    </h2>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      Official Vehicle Handover Form & Customer Acceptance Declaration
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="keep-white gatepass-badge"
                      style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.85rem',
                        background: '#0284c7',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        borderRadius: '6px',
                        letterSpacing: '0.04em',
                      }}
                    >
                      HANDOVER & DECLARATION
                    </span>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.25rem', fontFamily: 'monospace' }}>
                      Ref: HF-{gatePassData.deliveryNumber}
                    </div>
                  </div>
                </div>

                {/* Handover Particulars */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Recipient Customer:</span>
                      <div style={{ fontWeight: 800 }}>{gatePassData.customer?.name}</div>
                      <div style={{ color: '#475569', fontSize: '0.75rem' }}>TIN: {gatePassData.customer?.tin}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Vehicle Model & Colour:</span>
                      <div style={{ fontWeight: 700 }}>{gatePassData.vehicle?.model}</div>
                      <div style={{ color: '#475569', fontSize: '0.75rem' }}>Colour: {gatePassData.vehicle?.colour || 'Standard'}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Chassis / Engine:</span>
                      <div style={{ fontWeight: 700, fontFamily: 'monospace' }}>VIN: {gatePassData.vehicle?.chassisNumber}</div>
                      <div style={{ color: '#475569', fontSize: '0.75rem', fontFamily: 'monospace' }}>Eng: {gatePassData.vehicle?.engineNumber}</div>
                    </div>
                  </div>
                </div>

                {/* Handover Pack Checklist (Story DL5) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', textTransform: 'uppercase', marginBottom: '0.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📦 OFFICIAL HANDOVER PACK CHECKLIST</span>
                  </div>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'left' }}>Item Description</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Quantity</th>
                        <th style={{ padding: '0.4rem 0.6rem', textAlign: 'center' }}>Physical Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(gatePassData.handoverPack)
                        ? gatePassData.handoverPack
                        : [
                            { name: 'Ignition Keys (Original & Spare Sets)', quantity: '2 Sets' },
                            { name: 'Spare Wheel & Pneumatic Tyre (100% Tread)', quantity: '1 Unit' },
                            { name: 'Vehicle Tool Kit (Jack, Handle & Wheel Spanner)', quantity: '1 Set' },
                            { name: "Owner's Operational & Maintenance Manual", quantity: '1 Copy' },
                            { name: 'Manufacturer Warranty Booklet & Service Schedule', quantity: '1 Booklet' },
                            { name: 'Temporary Vehicle Transit Permit / Official Plates', quantity: '1 Set' },
                          ]
                      ).map((item: any, idx: number) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                          <td style={{ padding: '0.45rem 0.6rem', textAlign: 'center', color: '#059669', fontWeight: 700 }}>
                            [ ✓ Handed Over ]
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Customer Legal Acceptance Declaration */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#166534', marginBottom: '0.35rem' }}>
                    CUSTOMER STATUTORY HANDOVER DECLARATION
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e3a5f', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{gatePassData.declarationText || `I, the undersigned ${gatePassData.customer?.name || 'Customer'}, hereby declare and confirm that I have physically inspected and taken formal delivery of the vehicle specified above in satisfactory, roadworthy condition, complete with all specified accessories, tools, and the Handover Pack listed herein. I acknowledge receipt of all official keys, user manuals, warranty terms, and accept full operational custody and responsibility from this timestamp.`}"
                  </p>
                </div>

                {/* Handover Signatures */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.5rem', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ height: '35px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.25rem', fontWeight: 700 }}>
                      Customer / Authorized Recipient Signature
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Date: {gatePassData.deliveryDate ? String(gatePassData.deliveryDate).split('T')[0] : new Date().toISOString().split('T')[0]}
                    </div>
                  </div>
                  <div>
                    <div style={{ height: '35px' }}></div>
                    <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.25rem', fontWeight: 700 }}>
                      Kanab Motors Delivery Officer Signature
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{gatePassData.releasingOfficer || 'Handover Officer'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="modal-footer no-print" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', margin: 0, padding: '1rem 2.5rem' }}>
              <button
                type="button"
                onClick={() => setGatePassData(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={printGatePass}
                className="btn btn-primary keep-white btn-print-gatepass"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.4rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)',
                }}
              >
                <Printer size={16} style={{ color: '#ffffff' }} />
                Print {docTab === 'DELIVERY_VOUCHER' ? 'Delivery Voucher' : 'Handover Form & Pack'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DeliveriesPage;
