import React, { useState } from 'react';
import {
  Ship,
  Anchor,
  Box,
  Container,
  Calendar,
  Clock,
  FileText,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit3,
  FileCheck,
  Info,
  X,
  User,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { api, ShipmentLogisticsOverview } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EntityAttachmentsModal } from './EntityAttachmentsModal';
import { formatApiError } from '../utils/error';

type Field = { key: string; label: string; type?: string; options?: string[]; required?: boolean; step?: string };
const field = (key: string, label: string, type = 'text', required = false): Field => ({ key, label, type, required });
const select = (key: string, label: string, options: string[]): Field => ({ key, label, options });

const specs: Record<string, { title: string; icon: React.ReactNode; id: string; fields: Field[]; defaults: any; evidence?: any }> = {
  bookings: {
    title: 'Bookings & Vessel Schedules',
    icon: <Anchor size={18} className="text-cyan-500" />,
    id: 'bookingId',
    defaults: { bookingStatus: 'REQUESTED' },
    fields: [
      field('bookingReference', 'Booking reference', 'text', true),
      field('carrierName', 'Carrier / Shipping Line'),
      field('vesselName', 'Vessel Name'),
      field('voyageNumber', 'Voyage Number'),
      field('originPort', 'Port of Loading (Origin)'),
      field('destinationPort', 'Port of Discharge (Destination)'),
      field('estimatedDepartureDate', 'Estimated Departure (ETD)', 'date'),
      field('actualDepartureDate', 'Actual Departure (ATD)', 'date'),
      field('estimatedArrivalDate', 'Estimated Arrival (ETA)', 'date'),
      field('actualArrivalDate', 'Actual Arrival (ATA)', 'date'),
      select('bookingStatus', 'Booking Status', ['REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
    ],
  },
  containers: {
    title: 'Containers & Free-Time Deadlines',
    icon: <Container size={18} className="text-indigo-500" />,
    id: 'containerId',
    defaults: { freeTimeDays: 14, dayCounting: 'EXCLUSIVE', containerStatus: 'LOADED' },
    evidence: 'shipment_container',
    fields: [
      field('containerNumber', 'Container Number', 'text', true),
      field('containerType', 'Container Type (e.g. 40ft HC, 20ft STD)'),
      field('sealNumber', 'Customs Seal Number'),
      field('payloadCapacityKg', 'Payload Capacity (kg)', 'number'),
      field('grossWeightKg', 'Gross Cargo Weight (kg)', 'number'),
      field('loadingDate', 'Loading Date', 'date'),
      { ...field('freeTimeDays', 'Free-Time Allowance (Days)', 'number', true), step: '1' },
      field('freeTimeStartDate', 'Agreed Free-Time Start Date', 'date'),
      select('dayCounting', 'Free-Time Counting Convention', ['EXCLUSIVE', 'INCLUSIVE']),
      field('emptyReturnDueDate', 'Empty-Return Due Date', 'date'),
      field('actualEmptyReturnDate', 'Actual Empty Return Date', 'date'),
      select('containerStatus', 'Container Status', ['LOADED', 'IN_TRANSIT', 'DISCHARGED', 'AT_PORT', 'DELIVERED', 'RETURNED']),
    ],
  },
  milestones: {
    title: 'Cargo Readiness & Logistics Milestones',
    icon: <CheckCircle2 size={18} className="text-emerald-500" />,
    id: 'milestoneId',
    defaults: { isCompleted: false },
    fields: [
      field('milestoneName', 'Milestone Name', 'text', true),
      field('plannedDate', 'Planned Target Date', 'date'),
      field('milestoneDate', 'Actual Completion Date', 'date'),
      field('isCompleted', 'Mark as Completed', 'checkbox'),
    ],
  },
  insurance: {
    title: 'Marine Cargo Insurance Policies',
    icon: <Shield size={18} className="text-amber-500" />,
    id: 'insuranceId',
    defaults: { currency: 'USD', isActive: true },
    evidence: 'shipment_insurance',
    fields: [
      field('policyNumber', 'Insurance Policy Reference', 'text', true),
      field('insurerName', 'Insurance Underwriter / Company', 'text', true),
      field('insuredValue', 'Insured Sum / Coverage Amount', 'number', true),
      field('currency', 'Policy Currency', 'text', true),
      field('premiumAmount', 'Insurance Premium Paid', 'number'),
      field('coverageType', 'Coverage Type (e.g. ICC A All Risks, Marine Hull)'),
      field('issueDate', 'Policy Effective Date', 'date'),
      field('validUntil', 'Policy Expiry Date', 'date'),
      field('isActive', 'Policy Active and Valid', 'checkbox'),
    ],
  },
  tracking: {
    title: 'ECTN & Regulatory Shipping Requirements',
    icon: <FileCheck size={18} className="text-purple-500" />,
    id: 'trackingId',
    defaults: { documentName: 'ECTN', status: 'PENDING' },
    evidence: 'shipment_cargo_tracking',
    fields: [
      field('documentName', 'Document / Requirement Name', 'text', true),
      field('referenceNumber', 'Certificate / Reference Number'),
      select('status', 'Validation Status', ['PENDING', 'SUBMITTED', 'APPROVED', 'EXPIRED']),
      field('submissionDate', 'Submission Date', 'date'),
      field('deadlineDate', 'Mandatory Submission Deadline', 'date'),
      field('shippingCutOffDate', 'Vessel Cut-off Date', 'date'),
    ],
  },
};

const labelFor = (key: string) =>
  specs[Object.keys(specs).find((k) => specs[k].fields.some((f) => f.key === key)) || '']?.fields.find((f) => f.key === key)?.label ||
  key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');

const display = (v: any): string =>
  v === null || v === undefined || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'object' ? JSON.stringify(v) : String(v);

export function ShipmentOperations({
  shipmentId,
  overview,
  onRefresh,
}: {
  shipmentId: string;
  overview: ShipmentLogisticsOverview;
  onRefresh: () => Promise<void>;
}) {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('SHIPMENTS_CREATE');
  const canPolicy = hasPermission('COMPANY_PROFILE_EDIT');

  // Accordion toggle states
  const [showQuotesHistory, setShowQuotesHistory] = useState<boolean>(true);
  const [showLogisticsHistory, setShowLogisticsHistory] = useState<boolean>(false);
  const [showNotificationHistory, setShowNotificationHistory] = useState<boolean>(false);
  const [scanning, setScanning] = useState<boolean>(false);

  const [editor, setEditor] = useState<{ kind: string; id?: string } | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [configuration, setConfiguration] = useState<any>(null);
  const [policy, setPolicy] = useState<any>(null);
  const [offsets, setOffsets] = useState({ freeTimeOffsets: '7,3,1', returnOffsets: '7,3,1' });
  const [requirement, setRequirement] = useState(false);
  const [required, setRequired] = useState(false);
  const [reason, setReason] = useState('');

  const rows: Record<string, any[]> = {
    bookings: overview.bookings || [],
    containers: overview.containers || [],
    milestones: overview.milestones || [],
    insurance: overview.insurances || [],
    tracking: overview.cargoTracking || [],
  };

  const open = (kind: string, row?: any) => {
    setError('');
    setEditor({ kind, id: row?.[specs[kind].id] });
    setForm({ ...specs[kind].defaults, ...row, revisionReason: '' });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError('');
    try {
      const payload: any = {};
      for (const f of [...specs[editor.kind].fields, field('notes', 'Notes'), field('revisionReason', 'Change reason')]) {
        const value = form[f.key];
        if (value !== undefined && value !== '') payload[f.key] = f.type === 'number' ? Number(value) : value;
        else if (editor.id && value === '') payload[f.key] = null;
      }
      if (
        editor.kind === 'tracking' &&
        ['SUBMITTED', 'APPROVED'].includes(payload.status) &&
        (!payload.submissionDate || !payload.referenceNumber?.trim())
      ) {
        throw new Error('Submission date and reference are required for submitted or approved documents.');
      }
      await api.saveShipmentLogisticsRecord(shipmentId, editor.kind, payload, editor.id);
      setEditor(null);
      await onRefresh();
    } catch (e) {
      setError(formatApiError(e, 'Unable to save logistics record'));
    } finally {
      setBusy(false);
    }
  };

  const evidence = (entityType: string, entityId: string, title: string) => setAttachment({ entityType, entityId, title });

  const renderDeadlinePill = (title: string, state: any, date: string) => {
    const isOverdue = state?.status === 'OVERDUE';
    const isApproaching = state?.status === 'APPROACHING' || state?.status === 'DUE_TODAY';
    const isReturned = state?.status === 'RETURNED';

    let badgeClass = 'badge badge-outline';
    let textDesc = 'Start / deadline required';

    if (isReturned) {
      badgeClass = 'badge badge-success';
      textDesc = 'Returned';
    } else if (state?.days != null) {
      if (state.days < 0) {
        badgeClass = 'badge badge-danger';
        textDesc = `${Math.abs(state.days)} days overdue`;
      } else if (state.days === 0) {
        badgeClass = 'badge badge-warning';
        textDesc = 'Due Today';
      } else {
        badgeClass = state.days <= 3 ? 'badge badge-warning' : 'badge badge-success';
        textDesc = `${state.days} days remaining`;
      }
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <strong>{title}:</strong> {date || 'Not set'}
        </span>
        <span className={badgeClass} style={{ fontSize: '0.72rem', fontWeight: 600 }}>
          {textDesc}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
      {/* 1. OUTSTANDING LOGISTICS ACTIONS BANNER */}
      {(overview.logisticsActions || []).length > 0 && (
        <div
          className="card"
          style={{
            padding: '1.1rem 1.35rem',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-lg, 12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={18} className="text-amber-500" />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Outstanding Logistics Actions &amp; Pre-Shipment Checkpoints
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.35rem', fontSize: '0.83rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {overview.logisticsActions.map((action, i) => (
              <li key={i}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* TOP STATUS BAR: CALENDAR, TIMEZONE & POLICY CONFIG BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '0 0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Calendar size={15} />
          <span>
            Calendar Date: <strong style={{ color: 'var(--text-primary)' }}>{overview.logisticsToday}</strong> ({overview.logisticsTimezone}). Automatic reminder scans run every 15 minutes.
          </span>
        </div>
        {canPolicy && (
          <button
            type="button"
            className="btn btn-outline-primary"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            onClick={async () => {
              try {
                setError('');
                const c = await api.getShipmentLogisticsConfiguration();
                setConfiguration(c);
                setOffsets({
                  freeTimeOffsets: c.policy.freeTimeOffsets.join(','),
                  returnOffsets: c.policy.returnOffsets.join(','),
                });
                setPolicy(c.policy);
              } catch (e) {
                setError(formatApiError(e, 'Unable to load logistics configuration'));
              }
            }}
          >
            <Settings size={14} />
            Configure Reminders &amp; Checkpoints
          </button>
        )}
      </div>

      {error && !editor && !policy && !requirement && (
        <div className="card" style={{ padding: '0.85rem 1.25rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. QUOTATION DOCUMENTS & DECISION HISTORY (ELEGANT ACCORDION)             */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg, 12px)' }}>
        <div
          onClick={() => setShowQuotesHistory(!showQuotesHistory)}
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: showQuotesHistory ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <FileText size={18} className="text-indigo-500" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Quotation Documents &amp; Formal Decision Audit Trail
            </h3>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
              {(overview.quotations || []).length} quotes recorded
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem' }}>{showQuotesHistory ? 'Collapse' : 'Expand'}</span>
            {showQuotesHistory ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>

        {showQuotesHistory && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {(!overview.quotations || overview.quotations.length === 0) ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No freight quotations registered for this shipment yet. Use '+ Add Quotation' above to submit tender bids.
              </p>
            ) : (
              overview.quotations.map((quote) => {
                const isSelected = quote.selectionStatus === 'SELECTED';
                const isApproved = quote.approvalStatus === 'APPROVED';
                const isRejected = quote.selectionStatus === 'REJECTED' || quote.approvalStatus === 'REJECTED';

                return (
                  <div
                    key={quote.quotationId}
                    style={{
                      border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.4)' : isSelected ? 'rgba(99, 102, 241, 0.4)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-md, 8px)',
                      background: isApproved ? 'rgba(16, 185, 129, 0.02)' : isSelected ? 'rgba(99, 102, 241, 0.02)' : 'var(--bg-card)',
                      padding: '1.15rem',
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                            {quote.quotationReference || `QUOTE #${quote.quotationId}`}
                          </span>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            — {quote.forwarder?.name || 'Assigned Carrier'} ({quote.forwarder?.country || 'Origin'})
                          </span>
                          <span className={`badge ${isSelected ? 'badge-primary' : isRejected ? 'badge-outline' : 'badge-secondary'}`} style={{ fontSize: '0.68rem' }}>
                            Selection: {quote.selectionStatus}
                          </span>
                          <span className={`badge ${isApproved ? 'badge-success' : isRejected ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                            Approval: {quote.approvalStatus}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <span>Quoted: <strong style={{ color: 'var(--text-secondary)' }}>{quote.quotationDate || '—'}</strong></span>
                          <span>Valid Until: <strong style={{ color: 'var(--text-secondary)' }}>{quote.validUntil || '—'}</strong></span>
                          <span>Transit: <strong style={{ color: 'var(--text-secondary)' }}>{quote.estimatedTransitDays ? `${quote.estimatedTransitDays} days` : '—'}</strong></span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => evidence('shipment_freight_quotation', quote.quotationId, `Quotation ${quote.quotationReference || quote.quotationId} Supporting Documents`)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      >
                        <Paperclip size={14} />
                        Supporting Documents
                      </button>
                    </div>

                    {/* Additional terms banner */}
                    {quote.additionalTerms && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Scope &amp; Terms: </strong>
                        {quote.additionalTerms}
                      </div>
                    )}

                    {/* Decision History Trail */}
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                      <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Decision Audit Trail
                      </span>
                      {(!quote.decisionHistory || quote.decisionHistory.length === 0) ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                          No formal decisions recorded yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                          {quote.decisionHistory.map((h: any, idx: number) => {
                            const isDecisionApproved = h.decision === 'APPROVED';
                            const isDecisionSelected = h.decision === 'SELECTED';
                            const isDecisionRejected = h.decision === 'REJECTED';

                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                  padding: '0.35rem 0.6rem',
                                  background: 'var(--bg-tertiary, rgba(0,0,0,0.02))',
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span
                                    className={`badge ${isDecisionApproved ? 'badge-success' : isDecisionSelected ? 'badge-primary' : 'badge-danger'}`}
                                    style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}
                                  >
                                    {h.decision}
                                  </span>
                                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                    {h.reason || 'No justification recorded'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <User size={12} />
                                    {h.decidedByName || h.decided_by_name || h.decidedBy || 'System'}
                                  </span>
                                  <span>{h.decidedAt || h.decided_at ? new Date(h.decidedAt || h.decided_at).toLocaleString() : '—'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. OPERATIONAL SECTIONS: BOOKINGS, CONTAINERS, MILESTONES, INSURANCE, ECTN*/}
      {/* ========================================================================= */}
      {Object.entries(specs).map(([kind, spec]) => (
        <div className="card" key={kind} style={{ padding: '1.35rem', borderRadius: 'var(--radius-lg, 12px)' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {spec.icon}
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {spec.title}
              </h3>
              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {rows[kind].length} {rows[kind].length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {kind === 'insurance' && canEdit && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem' }}
                  onClick={() => {
                    setRequired(overview.insuranceRequired);
                    setReason('');
                    setError('');
                    setRequirement(true);
                  }}
                >
                  Change Requirement
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  onClick={() => open(kind)}
                >
                  <Plus size={14} />
                  Add {kind === 'tracking' ? 'Requirement' : kind === 'insurance' ? 'Policy' : kind === 'milestones' ? 'Milestone' : kind.slice(0, -1)}
                </button>
              )}
            </div>
          </div>

          {/* Insurance Requirement Status Banner */}
          {kind === 'insurance' && (
            <div
              style={{
                background: overview.insuranceRequired ? 'rgba(99, 102, 241, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                border: `1px solid ${overview.insuranceRequired ? 'rgba(99, 102, 241, 0.25)' : 'rgba(100, 116, 139, 0.25)'}`,
                borderRadius: '8px',
                padding: '0.65rem 0.9rem',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <strong style={{ color: overview.insuranceRequired ? 'var(--accent-indigo)' : 'var(--text-secondary)' }}>
                  Marine Cargo Insurance: {overview.insuranceRequired ? 'MANDATORY REQUIREMENT' : 'OPTIONAL / NOT REQUIRED'}
                </strong>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {overview.insuranceRequired
                    ? 'This shipment requires confirmed marine insurance coverage prior to stage progression.'
                    : 'Consignment policy rules do not block clearance or transit without an active policy.'}
                </p>
              </div>
              <span className={`badge ${overview.insuranceRequired ? 'badge-primary' : 'badge-outline'}`} style={{ fontSize: '0.7rem' }}>
                {overview.insuranceRequired ? 'Requirement Active' : 'Exempt'}
              </span>
            </div>
          )}

          {/* Empty State */}
          {!rows[kind].length ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No {spec.title.toLowerCase()} recorded for this shipment yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rows[kind].map((row) => (
                <div
                  key={row[spec.id]}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-card)',
                    padding: '1rem 1.15rem',
                  }}
                >
                  {/* Grid of Key Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem 1.25rem' }}>
                    {spec.fields
                      .filter((f) => f.type !== 'checkbox')
                      .map((f) => (
                        <div key={f.key}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                            {f.label}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.15rem' }}>
                            {display(row[f.key])}
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Container Special Expiry Section */}
                  {kind === 'containers' && (
                    <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.5rem 1.5rem' }}>
                        <div>{renderDeadlinePill('Free-Time Expiry', row.freeTime, row.freeTimeEndDate)}</div>
                        <div>{renderDeadlinePill('Empty Container Return', row.emptyReturn, row.emptyReturnDueDate)}</div>
                      </div>
                      <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Revision Sequence: <strong>#{row.deadlineRevision || 0}</strong> · Convention: <strong>{row.dayCounting || 'EXCLUSIVE'}</strong>
                      </div>
                    </div>
                  )}

                  {/* Milestone Special Progress Section */}
                  {kind === 'milestones' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <span className={`badge ${row.isCompleted ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.7rem' }}>
                        {row.isCompleted ? 'Milestone Completed' : 'Pending Milestone'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Target: <strong style={{ color: 'var(--text-secondary)' }}>{row.plannedDate || 'TBD'}</strong>
                        {row.isCompleted && (
                          <> · Completed on <strong style={{ color: 'var(--text-secondary)' }}>{row.milestoneDate || '—'}</strong> by {row.completer?.fullName || row.completedBy || 'System'}</>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Insurance Special Status Section */}
                  {kind === 'insurance' && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
                      <span
                        className={`badge ${!row.isActive
                          ? 'badge-danger'
                          : !row.issueDate || !row.validUntil
                            ? 'badge-warning'
                            : row.issueDate > overview.logisticsToday
                              ? 'badge-secondary'
                              : row.validUntil < overview.logisticsToday
                                ? 'badge-danger'
                                : 'badge-success'
                          }`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {!row.isActive
                          ? 'INACTIVE POLICY'
                          : !row.issueDate || !row.validUntil
                            ? 'VALIDITY NOT SET'
                            : row.issueDate > overview.logisticsToday
                              ? 'NOT YET EFFECTIVE'
                              : row.validUntil < overview.logisticsToday
                                ? 'POLICY EXPIRED'
                                : 'ACTIVE COVERAGE'}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        Coverage: <strong style={{ color: 'var(--text-primary)' }}>{row.currency} {Number(row.insuredValue || 0).toLocaleString()}</strong>
                        {row.premiumAmount && <> · Premium: {row.currency} {Number(row.premiumAmount).toLocaleString()}</>}
                      </span>
                    </div>
                  )}

                  {/* Notes if any */}
                  {row.notes && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.4rem 0.65rem', borderRadius: '4px' }}>
                      <strong>Remarks: </strong>{row.notes}
                    </div>
                  )}

                  {/* Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.85rem' }}>
                    {canEdit && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => open(kind, row)}
                      >
                        <Edit3 size={13} />
                        {kind === 'containers' ? 'Edit / Record Return' : 'Edit Details'}
                      </button>
                    )}
                    {spec.evidence && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => evidence(spec.evidence, row[spec.id], `${spec.title} Supporting Documents`)}
                      >
                        <Paperclip size={13} />
                        Supporting Documents
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* ========================================================================= */}
      {/* 4. CHANGE HISTORY (AUDIT TRAIL) — BEFORE / AFTER LOG                      */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg, 12px)' }}>
        <div
          onClick={() => setShowLogisticsHistory(!showLogisticsHistory)}
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: showLogisticsHistory ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Clock size={18} className="text-blue-500" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Operational Change History &amp; Field Audit Trail
            </h3>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
              {(overview.logisticsHistory || []).length} events
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.75rem' }}>{showLogisticsHistory ? 'Collapse' : 'Expand'}</span>
            {showLogisticsHistory ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </div>
        </div>

        {showLogisticsHistory && (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(!overview.logisticsHistory || overview.logisticsHistory.length === 0) ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No historical revisions recorded on this consignment yet.
              </p>
            ) : (
              overview.logisticsHistory.map((h) => {
                const changedKeys = Object.keys(h.new_value || {}).filter(
                  (k) => JSON.stringify(h.old_value?.[k]) !== JSON.stringify(h.new_value[k])
                );

                return (
                  <div key={h.history_id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.85rem 1rem', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          {h.entity_type.replace('shipment_', '').replace(/_/g, ' ')} #{h.entity_id}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Reason: {h.reason || 'Manual modification'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Actor: {h.actor || h.changed_by}</span>
                        <span>·</span>
                        <span>{new Date(h.changed_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {changedKeys.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '0.35rem 0.6rem' }}>Field Modified</th>
                            <th style={{ padding: '0.35rem 0.6rem' }}>Previous Value</th>
                            <th style={{ padding: '0.35rem 0.6rem' }}>New Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {changedKeys.map((k) => (
                            <tr key={k} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                              <td style={{ padding: '0.35rem 0.6rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{labelFor(k)}</td>
                              <td style={{ padding: '0.35rem 0.6rem', color: 'var(--accent-rose, #f43f5e)' }}>{display(h.old_value?.[k])}</td>
                              <td style={{ padding: '0.35rem 0.6rem', color: 'var(--accent-emerald, #10b981)', fontWeight: 600 }}>{display(h.new_value[k])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTAINER NOTIFICATION HISTORY TABLE                                   */}
      {/* ========================================================================= */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg, 12px)' }}>
        <div
          onClick={() => setShowNotificationHistory(!showNotificationHistory)}
          style={{
            padding: '1rem 1.25rem',
            background: 'var(--bg-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            borderBottom: showNotificationHistory ? '1px solid var(--border-color)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={18} className="text-amber-500" />
            <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Container Deadline Notification History &amp; Automated Alerts
            </h3>
            <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
              {(overview.containerNotifications || []).length} alerts sent
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-outline-primary"
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              disabled={scanning}
              onClick={async (e) => {
                e.stopPropagation();
                setScanning(true);
                try {
                  const count = await api.scanImportAlerts();
                  await onRefresh();
                  alert(`Deadline scan complete: ${count} notifications processed/delivered.`);
                } catch (err: any) {
                  alert(formatApiError(err, 'Failed to run deadline scan'));
                } finally {
                  setScanning(false);
                }
              }}
            >
              <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} />
              {scanning ? 'Scanning...' : 'Run Deadline Scan Now'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '0.75rem' }}>{showNotificationHistory ? 'Collapse' : 'Expand'}</span>
              {showNotificationHistory ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </div>
          </div>
        </div>

        {showNotificationHistory && (
          <div style={{ padding: '1.25rem', overflowX: 'auto' }}>
            {(!overview.containerNotifications || overview.containerNotifications.length === 0) ? (
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No automated reminders dispatched for this shipment. Scan triggers at 7, 3, and 1 days before deadline.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Event / Title</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Deadline Date</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Reminder Date</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Designated Recipient</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Delivery Status</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Delivered Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.containerNotifications.map((n) => (
                    <tr key={n.notification_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{n.title}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{n.deadline_date?.slice(0, 10)}</td>
                      <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'var(--font-mono)' }}>{n.reminder_date?.slice(0, 10)}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>{n.recipient_name || n.recipient_role}</td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <span className={`badge ${n.delivery_status === 'DELIVERED' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                          {n.delivery_status}
                        </span>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                        {n.delivered_at ? new Date(n.delivered_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT OPERATIONAL RECORD (BOOKING, CONTAINER, ETC.)         */}
      {/* ========================================================================= */}
      {editor && (
        <div className="modal-backdrop">
          <div className="modal-content" role="dialog" aria-modal="true" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div className="modal-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {specs[editor.kind].icon}
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {editor.id ? 'Edit' : 'Add New'} — {specs[editor.kind].title}
                </h3>
              </div>
              <button type="button" onClick={() => setEditor(null)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {[
                  ...specs[editor.kind].fields,
                  field('notes', 'Remarks / Operational Notes'),
                  ...(editor.id ? [field('revisionReason', 'Mandatory Audit Change Reason', 'text', true)] : []),
                ].map((f) => (
                  <div key={f.key}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                      {f.label} {f.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    {f.options ? (
                      <select
                        className="select w-full"
                        value={form[f.key] || f.options[0]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      >
                        {f.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : f.type === 'checkbox' ? (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={!!form[f.key]}
                          onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })}
                          style={{ width: '18px', height: '18px' }}
                        />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{f.label}</span>
                      </label>
                    ) : (
                      <input
                        className="input w-full"
                        type={f.type}
                        required={f.required}
                        min={f.type === 'number' ? 0 : undefined}
                        step={f.type === 'number' ? f.step || '0.01' : undefined}
                        value={form[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>

              {editor.kind === 'containers' && (
                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>Demurrage Rules: </span>
                  Free-time expiry is calculated from the agreed start date and free days allowance. Exclusive convention = start + days. Enter actual return date to officially stop alerts.
                </div>
              )}

              {error && (
                <div style={{ padding: '0.65rem', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setEditor(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INSURANCE REQUIREMENT TOGGLE                                     */}
      {/* ========================================================================= */}
      {requirement && (
        <div className="modal-backdrop">
          <form
            className="modal-content"
            style={{ maxWidth: 480, padding: '1.5rem', borderRadius: 'var(--radius-lg, 12px)' }}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api.setShipmentInsuranceRequirement(shipmentId, required, reason);
                setRequirement(false);
                await onRefresh();
              } catch (e) {
                setError(formatApiError(e, 'Unable to update insurance requirement'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="modal-header" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={18} className="text-amber-500" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Consignment Insurance Requirement</h3>
              </div>
              <button type="button" onClick={() => setRequirement(false)} className="btn btn-secondary">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Marine cargo insurance policy is mandatory for this shipment
                </span>
              </label>

              <div>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                  Requirement Change Justification *
                </label>
                <input
                  className="input w-full"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Under CIF commercial terms, supplier covers insurance; local policy exempt."
                />
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => setRequirement(false)}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? 'Saving...' : 'Update Requirement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: LOGISTICS CONFIGURATION / POLICY                                 */}
      {/* ========================================================================= */}
      {policy && (
        <div className="modal-backdrop">
          <form
            className="modal-content"
            style={{ maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                const parsed = Object.fromEntries(
                  Object.entries(offsets).map(([k, v]) => [k, v.split(',').map((n) => (n.trim() === '' ? NaN : Number(n)))])
                );
                if (Object.values(parsed).some((v: any) => v.some((n: number) => !Number.isInteger(n) || n < 0))) {
                  throw new Error('Reminder days must be comma-separated non-negative whole numbers.');
                }
                await api.saveShipmentLogisticsPolicy({ ...policy, ...parsed });
                setPolicy(null);
                await onRefresh();
              } catch (e) {
                setError(formatApiError(e, 'Unable to save configuration'));
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="modal-header" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Settings size={20} className="text-cyan-500" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Global Logistics &amp; Reminder Policy</h3>
              </div>
              <button type="button" onClick={() => setPolicy(null)} className="btn btn-secondary">
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                    Calendar Timezone *
                  </label>
                  <input
                    className="input w-full"
                    required
                    value={policy.timezone}
                    onChange={(e) => setPolicy({ ...policy, timezone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                    Container Number Uniqueness
                  </label>
                  <select
                    className="select w-full"
                    value={policy.containerUniqueness}
                    onChange={(e) => setPolicy({ ...policy, containerUniqueness: e.target.value })}
                  >
                    <option value="PER_SHIPMENT">PER_SHIPMENT (Unique within shipment)</option>
                    <option value="ACTIVE">ACTIVE (Across unreturned containers)</option>
                    <option value="GLOBAL">GLOBAL (Across all historical records)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                    Free-Time Reminders (Days Before) *
                  </label>
                  <input
                    className="input w-full"
                    required
                    value={offsets.freeTimeOffsets}
                    onChange={(e) => setOffsets({ ...offsets, freeTimeOffsets: e.target.value })}
                    placeholder="7,3,1"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.35rem', display: 'block' }}>
                    Empty-Return Reminders (Days Before) *
                  </label>
                  <input
                    className="input w-full"
                    required
                    value={offsets.returnOffsets}
                    onChange={(e) => setOffsets({ ...offsets, returnOffsets: e.target.value })}
                    placeholder="7,3,1"
                  />
                </div>
              </div>

              {/* Roles */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                  Responsible Reminder Recipient Roles
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {configuration?.roles?.map((r: any) => (
                    <label key={r.role_name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                      <input
                        type="checkbox"
                        checked={policy.recipientRoles.includes(r.role_name)}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            recipientRoles: e.target.checked
                              ? [...policy.recipientRoles, r.role_name]
                              : policy.recipientRoles.filter((v: string) => v !== r.role_name),
                          })
                        }
                      />
                      <span>{r.role_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Self-approval toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', padding: '0.65rem', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                <input
                  type="checkbox"
                  checked={policy.allowSelfApproval}
                  onChange={(e) => setPolicy({ ...policy, allowSelfApproval: e.target.checked })}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  Allow quotation selector to approve their own selection (Single-Admin Exception)
                </span>
              </label>

              {/* Milestone & Tracking Rules */}
              {['milestoneRules', 'trackingRules'].map((k) => (
                <div key={k} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {k === 'milestoneRules' ? 'Required Milestone Checkpoints' : 'Required Shipping Document Gates'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                      onClick={() =>
                        setPolicy({
                          ...policy,
                          [k]: [...policy[k], { name: '', destination: '', mode: '', stage: 'SHIPPED' }],
                        })
                      }
                    >
                      <Plus size={12} /> Add Rule
                    </button>
                  </div>

                  {policy[k]?.map((r: any, i: number) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <input
                        className="input w-full"
                        required
                        placeholder="Rule Name *"
                        value={r.name}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            [k]: policy[k].map((x: any, j: number) => (j === i ? { ...x, name: e.target.value } : x)),
                          })
                        }
                      />
                      <input
                        className="input w-full"
                        placeholder="All Destinations"
                        value={r.destination || ''}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            [k]: policy[k].map((x: any, j: number) => (j === i ? { ...x, destination: e.target.value } : x)),
                          })
                        }
                      />
                      <select
                        className="select w-full"
                        value={r.mode || ''}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            [k]: policy[k].map((x: any, j: number) => (j === i ? { ...x, mode: e.target.value } : x)),
                          })
                        }
                      >
                        <option value="">All Modes</option>
                        <option value="SEA">SEA</option>
                        <option value="AIR">AIR</option>
                        <option value="ROAD">ROAD</option>
                        <option value="RAIL">RAIL</option>
                      </select>
                      <select
                        className="select w-full"
                        value={r.stage}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            [k]: policy[k].map((x: any, j: number) => (j === i ? { ...x, stage: e.target.value } : x)),
                          })
                        }
                      >
                        {['ORDERED', 'SHIPPED', 'AT_DJIBOUTI_PORT', 'ETHIOPIAN_CUSTOMS_CLEARANCE', 'IN_TRANSIT_INLAND', 'RECEIVED'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-danger"
                        style={{ padding: '0.4rem 0.6rem' }}
                        onClick={() =>
                          setPolicy({
                            ...policy,
                            [k]: policy[k].filter((_: any, j: number) => j !== i),
                          })
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {error && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => setPolicy(null)}>
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ATTACHMENTS VIEWER / UPLOADER                                    */}
      {/* ========================================================================= */}
      {attachment && <EntityAttachmentsModal isOpen onClose={() => setAttachment(null)} {...attachment} />}
    </div>
  );
}
