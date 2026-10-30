import React, { useState, useEffect } from 'react';
import {
  Ship,
  Anchor,
  Box,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  Building2,
  Coins,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  Shipment,
  FreightForwarder,
  ShipmentFreightQuotation,
  ShipmentBooking,
  ShipmentContainer,
  ShipmentMilestone,
  ShipmentInsurance,
  ShipmentCargoTracking,
  ShipmentLogisticsOverview,
} from '../api/client';
import { formatApiError } from '../utils/error';

interface ShipmentLogisticsCockpitProps {
  shipmentId: string;
  onRefreshShipment?: () => void;
}

export const ShipmentLogisticsCockpit: React.FC<ShipmentLogisticsCockpitProps> = ({
  shipmentId,
  onRefreshShipment,
}) => {
  const [overview, setOverview] = useState<ShipmentLogisticsOverview | null>(null);
  const [forwarders, setForwarders] = useState<FreightForwarder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddQuoteModal, setShowAddQuoteModal] = useState<boolean>(false);
  const [showAddBookingModal, setShowAddBookingModal] = useState<boolean>(false);
  const [showAddContainerModal, setShowAddContainerModal] = useState<boolean>(false);
  const [showAddInsuranceModal, setShowAddInsuranceModal] = useState<boolean>(false);
  const [showAddTrackingModal, setShowAddTrackingModal] = useState<boolean>(false);
  const [selectingQuoteId, setSelectingQuoteId] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState<string>('');

  // Form states
  const [quoteForwarderId, setQuoteForwarderId] = useState<string>('');
  const [quoteReference, setQuoteReference] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<number>(3500);
  const [quoteCurrency, setQuoteCurrency] = useState<string>('USD');
  const [quoteTransitDays, setQuoteTransitDays] = useState<number>(25);
  const [quoteDestCharges, setQuoteDestCharges] = useState<number>(450);

  const [bookingRef, setBookingRef] = useState<string>('');
  const [vesselName, setVesselName] = useState<string>('Maersk Mc-Kinney Moller');
  const [voyageNumber, setVoyageNumber] = useState<string>('2405W');
  const [carrierName, setCarrierName] = useState<string>('Maersk Line');
  const [originPort, setOriginPort] = useState<string>('Nhava Sheva (JNPT), Mumbai, India');
  const [destinationPort, setDestinationPort] = useState<string>('Port of Djibouti / Mojo Dry Port');
  const [etdDate, setEtdDate] = useState<string>('');
  const [etaDate, setEtaDate] = useState<string>('');

  const [containerNumber, setContainerNumber] = useState<string>('');
  const [containerType, setContainerType] = useState<string>('40ft High Cube');
  const [sealNumber, setSealNumber] = useState<string>('');
  const [freeTimeDays, setFreeTimeDays] = useState<number>(14);

  const [policyNumber, setPolicyNumber] = useState<string>('');
  const [insurerName, setInsurerName] = useState<string>('Ethiopian Insurance Corporation (EIC)');
  const [insuredValue, setInsuredValue] = useState<number>(75000);
  const [premiumAmount, setPremiumAmount] = useState<number>(850);

  const [ectnReference, setEctnReference] = useState<string>('');
  const [ectnDeadline, setEctnDeadline] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    loadOverview();
  }, [shipmentId]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, fwdData] = await Promise.all([
        api.getShipmentLogisticsOverview(shipmentId),
        api.getFreightForwarders(true),
      ]);
      setOverview(ovData);
      setForwarders(fwdData);
      if (fwdData.length > 0 && !quoteForwarderId) {
        setQuoteForwarderId(fwdData[0].freightForwarderId);
      }
    } catch (err: any) {
      setError(formatApiError(err, 'Failed to load shipment logistics data'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForwarderId) return;
    setSaving(true);
    try {
      await api.addShipmentQuotation(shipmentId, {
        freightForwarderId: String(quoteForwarderId),
        quotationReference: quoteReference,
        freightAmount: Number(quoteAmount),
        currency: quoteCurrency,
        estimatedTransitDays: Number(quoteTransitDays),
        destinationCharges: Number(quoteDestCharges),
      });
      setShowAddQuoteModal(false);
      setQuoteReference('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to save freight quotation'));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectingQuoteId) return;
    setSaving(true);
    try {
      await api.selectShipmentQuotation(shipmentId, selectingQuoteId, {
        selectionReason: selectionReason.trim() || 'Selected based on competitive transit time and freight tariffs',
      });
      setSelectingQuoteId(null);
      setSelectionReason('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to select quotation'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createShipmentBooking(shipmentId, {
        bookingReference: bookingRef || `BK-${Date.now().toString().slice(-6)}`,
        vesselName,
        voyageNumber,
        carrierName,
        originPort,
        destinationPort,
        estimatedDepartureDate: etdDate || undefined,
        estimatedArrivalDate: etaDate || undefined,
        bookingStatus: 'CONFIRMED',
      });
      setShowAddBookingModal(false);
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to save shipment booking'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber.trim()) return;
    setSaving(true);
    try {
      await api.addShipmentContainer(shipmentId, {
        containerNumber: containerNumber.trim().toUpperCase(),
        containerType,
        sealNumber: sealNumber.trim() || undefined,
        freeTimeDays: Number(freeTimeDays) || 14,
        containerStatus: 'LOADED',
      });
      setShowAddContainerModal(false);
      setContainerNumber('');
      setSealNumber('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to add container'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyNumber.trim()) return;
    setSaving(true);
    try {
      await api.addShipmentInsurance(shipmentId, {
        policyNumber: policyNumber.trim(),
        insurerName: insurerName.trim(),
        insuredValue: Number(insuredValue),
        premiumAmount: Number(premiumAmount),
        currency: 'USD',
        coverageType: 'All Risks (Institute Cargo Clauses A)',
      });
      setShowAddInsuranceModal(false);
      setPolicyNumber('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to record cargo insurance'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addShipmentCargoTracking(shipmentId, {
        documentName: 'ECTN / BESC Certificate',
        referenceNumber: ectnReference.trim(),
        deadlineDate: ectnDeadline || undefined,
        status: 'SUBMITTED',
      });
      setShowAddTrackingModal(false);
      setEctnReference('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to record cargo tracking'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMilestone = async (milestoneId: string, currentCompleted: boolean) => {
    try {
      await api.updateShipmentMilestone(milestoneId, !currentCompleted);
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to update milestone'));
    }
  };

  if (loading && !overview) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <div>Loading shipment logistics arrangements...</div>
      </div>
    );
  }

  const activeBooking = overview?.activeBooking;
  const selectedQuote = overview?.selectedQuotation;

  return (
    <div style={{ marginTop: '1.25rem' }}>
      {/* Alert Banners (IMP-31) */}
      {(overview?.alerts || []).length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-amber)', background: 'rgba(245, 158, 11, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-amber)', marginBottom: '0.35rem' }}>
            <AlertTriangle size={18} />
            <span>Outstanding Logistics Actions & Pre-Shipment Checkpoints</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {overview?.alerts.map((a, idx) => (
              <li key={idx} style={{ marginTop: '0.2rem' }}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Top 3 KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Appointed Freight Forwarder
            </span>
            <Building2 size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {overview?.shipment?.selectedForwarder?.name || 'Unassigned'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {selectedQuote ? `Quoted: ${selectedQuote.currency} ${Number(selectedQuote.freightAmount).toLocaleString()}` : 'Awaiting quote confirmation'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active Vessel Booking
            </span>
            <Ship size={18} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeBooking?.vesselName || 'No booking registered'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {activeBooking ? `Voyage ${activeBooking.voyageNumber || '—'} (${activeBooking.carrierName || 'Ocean Carrier'})` : 'Schedule pending carrier confirmation'}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Containers in Transit
            </span>
            <Box size={18} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {overview?.containersCount || 0} Containers
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Standard 40ft High Cube & 20ft units assigned
          </div>
        </div>
      </div>

      {/* Section 1: Freight Quotations & Decision Matrix (IMP-24, IMP-25) */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Freight-Forwarder Quotations & Tariffs (IMP-24, IMP-25)
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Compare multi-currency forwarder rates, transit days, and record formal forwarder selection
            </p>
          </div>
          <button onClick={() => setShowAddQuoteModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}>
            <Plus size={14} />
            <span>Add Quotation</span>
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>Forwarder</th>
                <th style={{ padding: '0.75rem' }}>Reference</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Freight Charges</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Destination Charges</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Est. Transit</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(!overview?.quotations || overview.quotations.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No freight quotations recorded yet for this shipment.
                  </td>
                </tr>
              ) : (
                overview.quotations.map((quote) => {
                  const fwd = quote.forwarder || forwarders.find((f) => String(f.freightForwarderId) === String(quote.freightForwarderId));
                  const isSelected = quote.selectionStatus === 'SELECTED';
                  const isRejected = quote.selectionStatus === 'REJECTED';
                  return (
                    <tr
                      key={quote.quotationId}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.05)' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 size={16} color="var(--accent-blue)" />
                          <span>{fwd?.name || ('Forwarder #' + quote.freightForwarderId)}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {quote.quotationReference || '—'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                        {quote.currency} {Number(quote.freightAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                        {quote.currency} {Number(quote.destinationCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {quote.estimatedTransitDays ? (quote.estimatedTransitDays + ' days') : '—'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          className={'badge ' + (isSelected ? 'badge-success' : isRejected ? 'badge-outline' : 'badge-primary')}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {quote.selectionStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {isSelected ? (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={14} /> Selected
                          </span>
                        ) : isRejected ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rejected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectingQuoteId(quote.quotationId)}
                            className="btn btn-outline-primary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Select & Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Ocean Booking, Vessel Schedule & Containers (IMP-26, IMP-27) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Vessel Booking */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Shipment Booking & Vessel Schedule (IMP-26)
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Maritime carrier, vessel name, voyage number, ports, and transit timetable
              </p>
            </div>
            <button onClick={() => setShowAddBookingModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              {activeBooking ? 'Update Booking' : '+ Register Booking'}
            </button>
          </div>

          {activeBooking ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Booking Reference</span>
                <strong style={{ color: 'var(--accent-cyan)' }}>{activeBooking.bookingReference}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Ocean Carrier</span>
                <strong>{activeBooking.carrierName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Vessel & Voyage</span>
                <strong>{activeBooking.vesselName} / {activeBooking.voyageNumber || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Origin Port of Loading</span>
                <span>{activeBooking.originPort || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Destination Port of Discharge</span>
                <span>{activeBooking.destinationPort || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Est. Departure (ETD)</span>
                <span>{activeBooking.estimatedDepartureDate ? new Date(activeBooking.estimatedDepartureDate).toLocaleDateString() : '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Est. Arrival (ETA)</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 700 }}>
                  {activeBooking.estimatedArrivalDate ? new Date(activeBooking.estimatedArrivalDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Booking Status</span>
                <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>{activeBooking.bookingStatus}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No carrier booking registered. Click above to capture vessel details.
            </div>
          )}
        </div>

        {/* Containers List (IMP-27) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Assigned Containers (IMP-27)
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Container numbers, seal numbers, and demurrage free-time rules
              </p>
            </div>
            <button onClick={() => setShowAddContainerModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              + Add Container
            </button>
          </div>

          {(overview?.containers || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No containers assigned yet. Click "+ Add Container" to record 40ft/20ft boxes.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {overview?.containers.map((c) => (
                <div key={c.containerId} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>{c.containerNumber}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {c.containerType} {c.sealNumber ? `• Seal: ${c.sealNumber}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>{c.freeTimeDays} Days Free Time</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Status: {c.containerStatus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Cargo Readiness & Shipping Milestones Timeline (IMP-28) */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cargo Readiness & Shipping Milestones Progress (IMP-28)
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Track physical milestones leading to port departure, customs, and inland warehouse arrival
            </p>
          </div>
          <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
            {overview?.milestones.filter((m) => m.isCompleted).length || 0} of {overview?.milestones.length || 0} Completed
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {(overview?.milestones || []).map((m) => (
            <div
              key={m.milestoneId}
              onClick={() => handleToggleMilestone(m.milestoneId, m.isCompleted)}
              style={{
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: m.isCompleted ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                background: m.isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.4)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <CheckCircle2 size={16} color={m.isCompleted ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                <strong style={{ fontSize: '0.8rem', color: m.isCompleted ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                  {m.milestoneName.replace(/_/g, ' ')}
                </strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {m.isCompleted ? (
                  <span>Completed {m.completedAt ? new Date(m.completedAt).toLocaleDateString() : ''}</span>
                ) : (
                  <span>Click to mark complete</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Marine Insurance & Cargo Tracking (IMP-29, IMP-30) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Marine Cargo Insurance (IMP-29) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Marine Cargo Insurance (IMP-29)
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Institute Cargo Clauses A (All Risks) marine policy
              </p>
            </div>
            <button onClick={() => setShowAddInsuranceModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              + Record Policy
            </button>
          </div>

          {(overview?.insurances || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No insurance policy recorded yet.
            </div>
          ) : (
            overview?.insurances.map((ins) => (
              <div key={ins.insuranceId} style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{ins.policyNumber}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{ins.insurerName}</div>
                  </div>
                  <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>ACTIVE</span>
                </div>
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1.5rem' }}>
                  <span>Insured Value: <strong>{ins.currency} {Number(ins.insuredValue).toLocaleString()}</strong></span>
                  {ins.premiumAmount && <span>Premium: <strong>{ins.currency} {Number(ins.premiumAmount).toLocaleString()}</strong></span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cargo Tracking / ECTN (IMP-30) */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                ECTN & Cargo Tracking (IMP-30)
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Electronic Cargo Tracking Note & shipping cut-off deadlines
              </p>
            </div>
            <button onClick={() => setShowAddTrackingModal(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}>
              + Add ECTN
            </button>
          </div>

          {(overview?.cargoTracking || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No cargo tracking or ECTN certificate recorded.
            </div>
          ) : (
            overview?.cargoTracking.map((ct) => (
              <div key={ct.trackingId} style={{ padding: '0.85rem', background: 'rgba(15, 23, 42, 0.5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{ct.referenceNumber || 'Reference Pending'}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{ct.documentName}</div>
                  </div>
                  <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>{ct.status}</span>
                </div>
                {ct.deadlineDate && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-amber)' }}>
                    Submission Deadline: <strong>{new Date(ct.deadlineDate).toLocaleDateString()}</strong>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: ADD QUOTATION */}
      {showAddQuoteModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Add Freight-Forwarder Quotation (IMP-24)</h3>
              <button onClick={() => setShowAddQuoteModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateQuote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Freight Forwarder *</label>
                  <select
                    className="select w-full"
                    value={quoteForwarderId}
                    onChange={(e) => setQuoteForwarderId(e.target.value)}
                    required
                  >
                    <option value="">Select forwarder</option>
                    {forwarders.map((f) => (
                      <option key={f.freightForwarderId} value={f.freightForwarderId}>
                        {f.name} ({f.country})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Quotation Reference</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={quoteReference}
                      onChange={(e) => setQuoteReference(e.target.value)}
                      placeholder="e.g. QTE-BOL-2026-091"
                    />
                  </div>
                  <div>
                    <label className="form-label">Currency</label>
                    <select
                      className="select w-full"
                      value={quoteCurrency}
                      onChange={(e) => setQuoteCurrency(e.target.value)}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="ETB">ETB</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Ocean / Air Freight Rate *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Destination Charges (Port/Terminal)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full"
                      value={quoteDestCharges}
                      onChange={(e) => setQuoteDestCharges(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Estimated Transit Days</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={quoteTransitDays}
                    onChange={(e) => setQuoteTransitDays(parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddQuoteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER BOOKING */}
      {showAddBookingModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Shipment Booking & Vessel Details (IMP-26)</h3>
              <button onClick={() => setShowAddBookingModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Booking Reference *</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={bookingRef}
                      onChange={(e) => setBookingRef(e.target.value)}
                      placeholder="e.g. MSK-ADD-88192"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Ocean Carrier</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={carrierName}
                      onChange={(e) => setCarrierName(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Vessel Name *</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={vesselName}
                      onChange={(e) => setVesselName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Voyage Number</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={voyageNumber}
                      onChange={(e) => setVoyageNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Origin Port</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={originPort}
                      onChange={(e) => setOriginPort(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Destination Port</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Estimated Departure (ETD)</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={etdDate}
                      onChange={(e) => setEtdDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Estimated Arrival (ETA)</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={etaDate}
                      onChange={(e) => setEtaDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddBookingModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CONTAINER */}
      {showAddContainerModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Assign Container (IMP-27)</h3>
              <button onClick={() => setShowAddContainerModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleAddContainer}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Container Number *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={containerNumber}
                    onChange={(e) => setContainerNumber(e.target.value)}
                    placeholder="e.g. MSKU9812401"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Container Type</label>
                    <select
                      className="select w-full"
                      value={containerType}
                      onChange={(e) => setContainerType(e.target.value)}
                    >
                      <option value="40ft High Cube">40ft High Cube (HC)</option>
                      <option value="20ft Standard">20ft Standard</option>
                      <option value="40ft Standard">40ft Standard</option>
                      <option value="45ft High Cube">45ft High Cube</option>
                      <option value="LCL Consolidation">LCL Consolidation</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Seal Number</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      placeholder="e.g. SL-88129"
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label">Free Time (Days)</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={freeTimeDays}
                    onChange={(e) => setFreeTimeDays(parseInt(e.target.value, 10) || 14)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddContainerModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Add Container'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD INSURANCE */}
      {showAddInsuranceModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Record Cargo Insurance (IMP-29)</h3>
              <button onClick={() => setShowAddInsuranceModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleAddInsurance}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Policy Number *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. POL-EIC-2026-9921"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Insurer Name *</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={insurerName}
                    onChange={(e) => setInsurerName(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Insured Value (USD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full"
                      value={insuredValue}
                      onChange={(e) => setInsuredValue(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Premium Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full"
                      value={premiumAmount}
                      onChange={(e) => setPremiumAmount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddInsuranceModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD ECTN */}
      {showAddTrackingModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>Record ECTN / Cargo Tracking (IMP-30)</h3>
              <button onClick={() => setShowAddTrackingModal(false)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleAddTracking}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">ECTN / BESC Reference Number</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={ectnReference}
                    onChange={(e) => setEctnReference(e.target.value)}
                    placeholder="e.g. ECTN-ET-2026-0914"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Submission Deadline</label>
                  <input
                    type="date"
                    className="input w-full"
                    value={ectnDeadline}
                    onChange={(e) => setEctnDeadline(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddTrackingModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save ECTN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SELECT / APPROVE QUOTATION */}
      {selectingQuoteId && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Select & Appoint Freight Forwarder</h3>
              <button onClick={() => setSelectingQuoteId(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSelectQuote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Confirming this quotation will assign this freight forwarder to the shipment and mark competing quotations as rejected.
                </p>
                <div>
                  <label className="form-label">Selection Justification / Notes</label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    value={selectionReason}
                    onChange={(e) => setSelectionReason(e.target.value)}
                    placeholder="e.g. Best negotiated rates, direct route, and lowest transit time."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setSelectingQuoteId(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Confirming...' : 'Confirm & Appoint Forwarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

