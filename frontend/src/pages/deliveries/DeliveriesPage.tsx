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
import {
  api,
  Delivery,
  PdiChecklistItem,
  VehicleUnit,
  Booking,
} from '../../api/client';

export const DeliveriesPage: React.FC = () => {
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
  const [authorizeDeliveryModal, setAuthorizeDeliveryModal] = useState<Delivery | null>(null);
  const [gatePassData, setGatePassData] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
      setErrorMsg(err.response?.data?.message || 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPdi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateVehicleStatus) return;
    if (!pdiVehicleId) {
      setErrorMsg('Please select a vehicle for PDI inspection');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
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
      setErrorMsg(err.response?.data?.message || 'Failed to record PDI inspection');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateVehicleStatus) return;
    if (!deliveryBookingId || !deliveryVehicleId) {
      setErrorMsg('Please select both a booking and a vehicle unit');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
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
      setErrorMsg(err.response?.data?.message || 'Failed to create delivery order');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmAuthorizeDelivery = async () => {
    if (!authorizeDeliveryModal || !canUpdateVehicleStatus) return;
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await api.authorizeDelivery(authorizeDeliveryModal.deliveryId, 'Handover authorized and verified by Sales Manager');
      setSuccessMsg(`Delivery order ${authorizeDeliveryModal.deliveryNumber} authorized successfully! Vehicle transitioned to DELIVERED.`);
      setAuthorizeDeliveryModal(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Authorization failed. Verify PDI inspection and settlement.');
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
      setErrorMsg(err.response?.data?.message || 'Failed to generate gate pass');
    } finally {
      setActionLoading(false);
    }
  };

  const printGatePass = () => {
    window.print();
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
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(0, 210, 211, 0.2))',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
              }}
            >
              <Car size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Delivery & Vehicle Handover</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                Pre-Delivery Inspection (PDI), Financial Settlement Verification & Gate Pass Dispatch
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canUpdateVehicleStatus && (
          <button
            onClick={() => setShowPdiModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(0, 210, 211, 0.4)',
              background: 'rgba(0, 210, 211, 0.1)',
              color: 'var(--accent-cyan)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <ClipboardCheck size={18} />
            Record PDI Inspection
          </button>
          )}
          {canUpdateVehicleStatus && (
          <button
            onClick={() => setShowDeliveryModal(true)}
            className="btn btn-cyan"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Plus size={18} />
            New Handover Order
          </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('DELIVERIES')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'DELIVERIES' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            borderBottom: activeTab === 'DELIVERIES' ? '2px solid var(--accent-cyan)' : 'none',
          }}
        >
          Delivery Orders & Gate Passes ({deliveries.length})
        </button>
        <button
          onClick={() => setActiveTab('PDI')}
          style={{
            background: 'none',
            border: 'none',
            padding: '0.5rem 1rem',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeTab === 'PDI' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            borderBottom: activeTab === 'PDI' ? '2px solid var(--accent-cyan)' : 'none',
          }}
        >
          PDI Checklist Station ({checklistItems.length} Checks)
        </button>
      </div>

      {activeTab === 'DELIVERIES' ? (
        <>
          {/* Deliveries Table */}
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Delivery #</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Chassis & Vehicle</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Handover Date</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>PDI Checked</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Settlement</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
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
                                onClick={() => setAuthorizeDeliveryModal(del)}
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
        <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Mandatory Pre-Delivery Inspection (PDI) Standards</h3>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Mandatory Quality Standard: All 7 inspection criteria must be verified and cleared before dispatch authorization.
              </p>
            </div>
            {canUpdateVehicleStatus && (
            <button
              onClick={() => setShowPdiModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                background: 'var(--accent-cyan)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Start Inspection
            </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {checklistItems.map((item, idx) => (
              <div
                key={item.pdiChecklistItemId}
                style={{
                  padding: '1.25rem',
                  borderRadius: '10px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
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
                  <div style={{ fontSize: '0.75rem', color: '#10b981' }}>Standard Requirement</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECORD PDI MODAL */}
      {showPdiModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPdiModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(0, 210, 211, 0.12)',
                    border: '1px solid rgba(0, 210, 211, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Record Vehicle PDI Inspection
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>
                    Mandatory Technical Check before Delivery Handover (DL1–DL3)
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
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Target Vehicle Unit *
                  </label>
                  <select
                    className="input"
                    value={pdiVehicleId}
                    onChange={(e) => setPdiVehicleId(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select Vehicle to Inspect --</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicleUnitId} value={v.vehicleUnitId}>
                        VIN: {v.chassisNumber} ({v.currentStatus}) — {v.item?.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
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
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <ClipboardCheck size={16} />
                  {actionLoading ? 'Recording...' : 'Submit PDI Results'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE DELIVERY MODAL */}
      {showDeliveryModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeliveryModal(false);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '580px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Car size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    New Handover Order
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                    Customer Handover, Settlement Clearance & Gate Pass (DL4–DL5)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Target Booking Order *
                  </label>
                  <select
                    className="input"
                    value={deliveryBookingId}
                    onChange={(e) => setDeliveryBookingId(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select Customer Booking --</option>
                    {bookings.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.bookingNumber} — {b.customer?.fullName} ({b.item?.itemName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Vehicle Unit (VIN) *
                  </label>
                  <select
                    className="input"
                    value={deliveryVehicleId}
                    onChange={(e) => setDeliveryVehicleId(e.target.value)}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Select Vehicle Unit --</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicleUnitId} value={v.vehicleUnitId}>
                        VIN: {v.chassisNumber} ({v.currentStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}
                  >
                    Handover Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{ width: '100%' }}
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
                    <span style={{ fontSize: '0.875rem' }}>Financial Settlement Confirmed (DL3)</span>
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
                  className="btn btn-emerald"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: '#000', fontWeight: 700 }}
                >
                  <Key size={16} />
                  {actionLoading ? 'Creating...' : 'Create Handover Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL GATE PASS MODAL (STORY DL5) */}
      {gatePassData && (
        <div
          className="modal-backdrop gatepass-modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGatePassData(null);
          }}
        >
          <div
            id="printable-gate-pass"
            className="gatepass-modal-content gatepass-document"
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '16px',
              maxWidth: '680px',
              width: '100%',
              padding: '2.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            }}
          >
            {/* Gate pass header */}
            <div
              style={{
                borderBottom: '2px solid #0f172a',
                paddingBottom: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#0f172a',
                  }}
                >
                  KANAB MOTORS PLC
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Integrated Sales, Inventory & Customer Account Management
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span
                    className="gatepass-badge keep-white"
                    style={{
                      display: 'inline-block',
                      padding: '0.35rem 0.85rem',
                      background: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                      letterSpacing: '0.05em',
                      borderRadius: '4px',
                    }}
                  >
                    OFFICIAL GATE PASS
                  </span>
                  <button
                    onClick={() => setGatePassData(null)}
                    className="no-print"
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#475569',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    title="Close modal"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>
                  {gatePassData.gatePassNumber}
                </div>
              </div>
            </div>

            {/* Verification status stamp */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    Recipient Customer
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{gatePassData.customer?.name}</div>
                  <div style={{ color: '#334155', marginTop: '0.25rem' }}>Phone: {gatePassData.customer?.phone || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                    Handover Reference
                  </div>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>Order: {gatePassData.booking?.bookingNumber}</div>
                  <div style={{ color: '#334155', marginTop: '0.25rem' }}>Date: {gatePassData.deliveryDate}</div>
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                VEHICLE DISPATCH CREDENTIALS
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Chassis / VIN:</span>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem', color: '#0f172a' }}>{gatePassData.vehicle?.chassisNumber}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Engine Number:</span>
                  <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem', color: '#0f172a' }}>{gatePassData.vehicle?.engineNumber}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem' }}>Model:</span>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{gatePassData.vehicle?.model}</div>
                </div>
              </div>
            </div>

            {/* Audit clearance badges */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
              <div
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  color: '#047857',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                ✓ PDI INSPECTION VERIFIED ({gatePassData.pdiSummary?.passedChecks}/{gatePassData.pdiSummary?.totalChecks || 7})
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '0.625rem',
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  color: '#047857',
                  borderRadius: '8px',
                  textAlign: 'center',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                ✓ FINANCIAL SETTLEMENT CLEARED
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.75rem', fontSize: '0.85rem' }}>
              <div>
                <div style={{ height: '35px' }}></div>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.35rem', fontWeight: 700, color: '#0f172a' }}>
                  Security & Yard Manager Signature
                </div>
              </div>
              <div>
                <div style={{ height: '35px' }}></div>
                <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.35rem', fontWeight: 700, color: '#0f172a' }}>
                  Customer Acceptance Signature
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <button
                onClick={() => setGatePassData(null)}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Close
              </button>
              <button
                onClick={printGatePass}
                className="btn-print-gatepass keep-white"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 1.35rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Printer size={16} color="#ffffff" />
                <span className="keep-white" style={{ color: '#ffffff', fontWeight: 700 }}>Print Official Pass</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTHORIZE RELEASE CONFIRMATION POPUP MODAL */}
      {authorizeDeliveryModal && (
        <div
          className="modal-backdrop"
          style={{ zIndex: 1100 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !actionLoading) setAuthorizeDeliveryModal(null);
          }}
        >
          <div className="modal-content" style={{ maxWidth: '520px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Authorize Vehicle Release
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#10b981' }}>
                    Order: {authorizeDeliveryModal.deliveryNumber}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthorizeDeliveryModal(null)}
                className="btn btn-secondary"
                disabled={actionLoading}
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem',
                  fontSize: '0.875rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Recipient Customer</span>
                    <div style={{ fontWeight: 600 }}>{authorizeDeliveryModal.booking?.customer?.fullName || 'N/A'}</div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Chassis / VIN</span>
                    <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {authorizeDeliveryModal.vehicleUnit?.chassisNumber}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: '0.85rem 1rem',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  color: '#10b981',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}
              >
                <strong>Handover Release Gate:</strong> Authorizing this release verifies technical PDI certification and financial settlement clearance, transitioning vehicle to <strong>DELIVERED</strong>.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setAuthorizeDeliveryModal(null)}
                className="btn btn-secondary"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAuthorizeDelivery}
                disabled={actionLoading}
                className="btn btn-emerald"
                style={{
                  background: '#10b981',
                  color: '#000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <CheckCircle2 size={16} />
                {actionLoading ? 'Releasing...' : 'Authorize & Release Vehicle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DeliveriesPage;
