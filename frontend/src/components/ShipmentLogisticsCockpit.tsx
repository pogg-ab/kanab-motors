import React, { useState, useEffect, useCallback } from 'react';
import {
  Ship,
  Box,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  Building2,
} from 'lucide-react';
import {
  api,
  FreightForwarder,
  ShipmentLogisticsOverview,
  ShipmentDocument,
} from '../api/client';
import { formatApiError } from '../utils/error';
import { useAuth } from '../context/AuthContext';
import { ShipmentOperations } from './ShipmentOperations';

interface ShipmentLogisticsCockpitProps {
  shipmentId: string;
  onRefreshShipment?: () => void;
}

export const ShipmentLogisticsCockpit: React.FC<ShipmentLogisticsCockpitProps> = ({
  shipmentId,
  onRefreshShipment,
}) => {
  const { hasPermission } = useAuth();
  const canSelectQuotation = hasPermission('SHIPMENTS_CREATE');
  const canApproveQuotation = hasPermission('SHIPMENTS_QUOTATION_APPROVE');
  const [overview, setOverview] = useState<ShipmentLogisticsOverview | null>(null);
  const [forwarders, setForwarders] = useState<FreightForwarder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showAddQuoteModal, setShowAddQuoteModal] = useState<boolean>(false);
  const [selectingQuoteId, setSelectingQuoteId] = useState<string | null>(null);
  const [selectionReason, setSelectionReason] = useState<string>('');
  const [decisionModal, setDecisionModal] = useState<{ mode: 'APPROVE' | 'REJECT'; quotationId: string } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<string>('');

  // Form states
  const [quoteForwarderId, setQuoteForwarderId] = useState<string>('');
  const [quoteReference, setQuoteReference] = useState<string>('');
  const [quoteAmount, setQuoteAmount] = useState<number>(3500);
  const [quoteCurrency, setQuoteCurrency] = useState<string>('USD');
  const [quoteTransitDays, setQuoteTransitDays] = useState<number>(25);
  const [quoteDestCharges, setQuoteDestCharges] = useState<number>(450);
  const [quoteDate, setQuoteDate] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState('');
  const [quoteTerms, setQuoteTerms] = useState('');

  const [editingDoc, setEditingDoc] = useState<ShipmentDocument | null>(null);
  const [docReference, setDocReference] = useState<string>('');
  const [docIssueDate, setDocIssueDate] = useState<string>('');
  const [docVerificationStatus, setDocVerificationStatus] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [docOriginalStatus, setDocOriginalStatus] = useState<string>('RELEASED_TO_AGENT');
  const [docNotes, setDocNotes] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovData, fwdData] = await Promise.all([
        api.getShipmentLogisticsOverview(shipmentId),
        api.getFreightForwarders(true),
      ]);
      setOverview(ovData);
      setForwarders(fwdData);
      if (fwdData.length > 0) {
        setQuoteForwarderId(current => current || fwdData[0].freightForwarderId);
      }
    } catch (err: any) {
      setError(formatApiError(err, 'Failed to load shipment logistics data'));
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => { void loadOverview(); }, [loadOverview]);

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
        quotationDate: quoteDate || undefined,
        validUntil: quoteValidUntil || undefined,
        additionalTerms: quoteTerms || undefined,
      });
      setShowAddQuoteModal(false);
      setQuoteReference('');
      setQuoteDate(''); setQuoteValidUntil(''); setQuoteTerms('');
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

  const handleQuoteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;
    setSaving(true);
    try {
      if (decisionModal.mode === 'APPROVE') {
        await api.approveShipmentQuotation(shipmentId, decisionModal.quotationId, {
          approvalNotes: decisionNotes.trim() || 'Approved by authorized approver',
        });
      } else {
        if (!decisionNotes.trim()) {
          alert('Rejection reason is required.');
          setSaving(false);
          return;
        }
        await api.rejectShipmentQuotation(shipmentId, decisionModal.quotationId, {
          rejectionReason: decisionNotes.trim(),
        });
      }
      setDecisionModal(null);
      setDecisionNotes('');
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, `Failed to ${decisionModal.mode.toLowerCase()} quotation`));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditDoc = (doc: ShipmentDocument) => {
    setEditingDoc(doc);
    setDocReference(doc.documentReference || '');
    setDocIssueDate(doc.issueDate ? doc.issueDate.split('T')[0] : '');
    setDocVerificationStatus(doc.verificationStatus === 'REJECTED' ? 'REJECTED' : 'VERIFIED');
    setDocOriginalStatus(doc.originalDocumentStatus || 'RELEASED_TO_AGENT');
    setDocNotes(doc.verificationNotes || '');
  };

  const handleUpdateDocStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setSaving(true);
    try {
      await api.verifyShipmentDocument(editingDoc.shipmentDocumentId, {
        status: docVerificationStatus,
        documentReference: docReference.trim() || undefined,
        issueDate: docIssueDate || undefined,
        originalDocumentStatus: docOriginalStatus,
        notes: docNotes.trim() || undefined,
      });
      setEditingDoc(null);
      await loadOverview();
      if (onRefreshShipment) onRefreshShipment();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to update document status'));
    } finally {
      setSaving(false);
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
      {error && <p role="alert">{error}</p>}
      {/* Logistics Action Items & Checkpoints */}
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
              Freight-Forwarder Quotations & Tariffs
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
                  const approvalStatus = quote.approvalStatus || (isSelected ? 'PENDING' : 'PENDING');
                  const isApproved = approvalStatus === 'APPROVED';
                  const isRejected = quote.selectionStatus === 'REJECTED' || approvalStatus === 'REJECTED';
                  return (
                    <tr
                      key={quote.quotationId}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isApproved
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isSelected
                            ? 'rgba(245, 158, 11, 0.06)'
                            : undefined,
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Building2 size={16} color="var(--accent-blue)" />
                          <span>{fwd?.name || ('Forwarder #' + quote.freightForwarderId)}</span>
                        </div>
                        {quote.selectionReason && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Selection note: {quote.selectionReason}
                          </div>
                        )}
                        {quote.rejectionReason && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.2rem' }}>
                            Rejection: {quote.rejectionReason}
                          </div>
                        )}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center' }}>
                          <span
                            className={'badge ' + (isSelected ? 'badge-cyan' : isRejected ? 'badge-subtle' : 'badge-subtle')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            Selection: {quote.selectionStatus}
                          </span>
                          <span
                            className={'badge ' + (isApproved ? 'badge-emerald' : isRejected ? 'badge-rose' : 'badge-amber')}
                            style={{ fontSize: '0.7rem' }}
                          >
                            Approval: {approvalStatus}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {isApproved ? (
                            <span style={{ color: 'var(--accent-emerald)', fontWeight: 700, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <CheckCircle2 size={14} /> Approved
                            </span>
                          ) : isRejected ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Rejected</span>
                          ) : isSelected ? (
                            <>
                              {canApproveQuotation ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDecisionNotes('');
                                      setDecisionModal({ mode: 'APPROVE', quotationId: quote.quotationId });
                                    }}
                                    className="btn btn-success"
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDecisionNotes('');
                                      setDecisionModal({ mode: 'REJECT', quotationId: quote.quotationId });
                                    }}
                                    className="btn btn-outline-danger"
                                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span style={{ color: 'var(--accent-amber)', fontWeight: 600, fontSize: '0.78rem' }}>
                                  Pending Approval
                                </span>
                              )}
                            </>
                          ) : (
                            canSelectQuotation && (
                              <button
                                type="button"
                                onClick={() => setSelectingQuoteId(quote.quotationId)}
                                className="btn btn-outline-primary"
                                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                              >
                                Select for Approval
                              </button>
                            )
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

      {overview && <ShipmentOperations shipmentId={shipmentId} overview={overview} onRefresh={async () => { await loadOverview(); onRefreshShipment?.(); }} />}

      {/* Section 5: Shipping Document Lifecycle & Verification */}
      <div className="card" style={{ padding: '1.5rem', marginTop: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Shipping Document Lifecycle & Verification
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Manage regulatory shipping documents, verification status, and physical original paper tracking
            </p>
          </div>
          <span className="badge badge-subtle" style={{ fontSize: '0.75rem' }}>
            {(overview?.documents || []).filter((d) => d.verificationStatus === 'VERIFIED').length} of {(overview?.documents || []).length} Verified
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>Document Type</th>
                <th style={{ padding: '0.75rem' }}>Reference / No.</th>
                <th style={{ padding: '0.75rem' }}>Issue Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Verification Status</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Original Paper Status</th>
                <th style={{ padding: '0.75rem' }}>Verified By</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(!overview?.documents || overview.documents.length === 0) ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No shipping documents initialized.
                  </td>
                </tr>
              ) : (
                overview.documents.map((doc) => {
                  const isVerified = doc.verificationStatus === 'VERIFIED';
                  const isRejected = doc.verificationStatus === 'REJECTED';
                  return (
                    <tr
                      key={doc.shipmentDocumentId}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        background: isVerified ? 'rgba(16, 185, 129, 0.05)' : isRejected ? 'rgba(239, 68, 68, 0.05)' : undefined,
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={16} color="var(--accent-cyan)" />
                          <span>{doc.documentType.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>
                        {doc.documentReference || '—'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span
                          className={'badge ' + (isVerified ? 'badge-emerald' : isRejected ? 'badge-rose' : 'badge-subtle')}
                          style={{ fontSize: '0.72rem' }}
                        >
                          {doc.verificationStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span className="badge badge-subtle" style={{ fontSize: '0.72rem' }}>
                          {(doc.originalDocumentStatus || 'NOT_RECEIVED').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {doc.verifier?.fullName || (isVerified ? 'System / Verified' : '—')}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditDoc(doc)}
                          className="btn btn-outline-primary"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ADD QUOTATION */}
      {showAddQuoteModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ship size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Add Freight-Forwarder Quotation
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Compare multi-currency carrier tariffs, transit times, and tender submissions
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Freight Forwarder *
                  </label>
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

                <div className="logistics-form-grid">
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Quotation Reference
                    </label>
                    <input
                      type="text"
                      className="input w-full"
                      value={quoteReference}
                      onChange={(e) => setQuoteReference(e.target.value)}
                      placeholder="e.g. QTE-BOL-2026-091"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Currency *
                    </label>
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

                <div className="logistics-form-grid">
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Quotation Date
                    </label>
                    <input
                      className="input w-full"
                      type="date"
                      value={quoteDate}
                      onChange={(e) => setQuoteDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Valid Until Date
                    </label>
                    <input
                      className="input w-full"
                      type="date"
                      min={quoteDate || undefined}
                      value={quoteValidUntil}
                      onChange={(e) => setQuoteValidUntil(e.target.value)}
                    />
                  </div>
                </div>

                <div className="logistics-form-grid">
                  <div>
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Ocean / Air Freight Rate *
                    </label>
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
                    <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                      Destination Charges (Port/Terminal)
                    </label>
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
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Estimated Transit Days
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    value={quoteTransitDays}
                    onChange={(e) => setQuoteTransitDays(parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontWeight: 600, marginBottom: '0.35rem', display: 'block' }}>
                    Additional Terms & Scope Remarks
                  </label>
                  <textarea
                    className="input w-full"
                    rows={2}
                    value={quoteTerms}
                    onChange={(e) => setQuoteTerms(e.target.value)}
                    placeholder="e.g. Free storage 14 days at origin; destination THC included."
                  />
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '0.65rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>Note:</span> Supporting quote files (PDF/scans) can be attached after saving under Quotation Documents &amp; Decision History.
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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

      {/* MODAL: SELECT QUOTATION FOR APPROVAL */}
      {selectingQuoteId && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Select Freight Quotation for Approval</h3>
              <button onClick={() => setSelectingQuoteId(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleSelectQuote}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Selecting this quotation submits it for authorization approval before appointing the freight forwarder to the shipment.
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
                  {saving ? 'Submitting...' : 'Submit Selection for Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE / REJECT QUOTATION */}
      {decisionModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{decisionModal.mode === 'APPROVE' ? 'Approve Selected Quotation' : 'Reject Freight Quotation'}</h3>
              <button onClick={() => setDecisionModal(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleQuoteDecision}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {decisionModal.mode === 'APPROVE'
                    ? 'Approving appoints the selected freight forwarder to the shipment and rejects competing quotations.'
                    : 'Rejecting records your reason in the decision audit trail and prevents appointing this quotation.'}
                </p>
                <div>
                  <label className="form-label">
                    {decisionModal.mode === 'APPROVE' ? 'Approval Notes' : 'Rejection Reason *'}
                  </label>
                  <textarea
                    className="input w-full"
                    rows={3}
                    required={decisionModal.mode === 'REJECT'}
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    placeholder={decisionModal.mode === 'APPROVE' ? 'Optional approval remarks...' : 'Provide reason for rejection...'}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setDecisionModal(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={decisionModal.mode === 'APPROVE' ? 'btn btn-success' : 'btn btn-danger'}
                >
                  {saving ? 'Saving...' : decisionModal.mode === 'APPROVE' ? 'Approve Forwarder' : 'Reject Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: UPDATE DOCUMENT STATUS (IMP-34, IMP-36) */}
      {editingDoc && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>Update Document Verification & Status</h3>
              <button onClick={() => setEditingDoc(null)} className="modal-close">&times;</button>
            </div>
            <form onSubmit={handleUpdateDocStatus}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Document Type</label>
                  <input
                    type="text"
                    className="input w-full"
                    disabled
                    value={editingDoc.documentType.replace(/_/g, ' ')}
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                  />
                </div>

                <div className="logistics-form-grid">
                  <div>
                    <label className="form-label">Document Reference #</label>
                    <input
                      type="text"
                      className="input w-full"
                      value={docReference}
                      onChange={(e) => setDocReference(e.target.value)}
                      placeholder="e.g. ESLSE-BL-ADD-901"
                    />
                  </div>
                  <div>
                    <label className="form-label">Issue Date</label>
                    <input
                      type="date"
                      className="input w-full"
                      value={docIssueDate}
                      onChange={(e) => setDocIssueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="logistics-form-grid">
                  <div>
                    <label className="form-label">Verification Status *</label>
                    <select
                      className="input w-full"
                      value={docVerificationStatus}
                      onChange={(e) => setDocVerificationStatus(e.target.value as any)}
                    >
                      <option value="VERIFIED">VERIFIED</option>
                      <option value="PENDING">PENDING</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Original Paper Status *</label>
                    <select
                      className="input w-full"
                      value={docOriginalStatus}
                      onChange={(e) => setDocOriginalStatus(e.target.value)}
                    >
                      <option value="RELEASED_TO_AGENT">RELEASED_TO_AGENT</option>
                      <option value="RECEIVED">RECEIVED</option>
                      <option value="NOT_RECEIVED">NOT_RECEIVED</option>
                      <option value="ENDORSED_TO_BANK">ENDORSED_TO_BANK</option>
                      <option value="SURRENDERED">SURRENDERED</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Verification Notes / Remarks</label>
                  <textarea
                    className="input w-full"
                    rows={2}
                    value={docNotes}
                    onChange={(e) => setDocNotes(e.target.value)}
                    placeholder="e.g. Original B/L verified with ESLSE booking agent."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setEditingDoc(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving...' : 'Save Document Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

