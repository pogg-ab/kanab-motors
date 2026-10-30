import React, { useState, useEffect } from 'react';
import {
  Ship,
  FileCheck,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../api/client';
import { formatApiError } from '../utils/error';

interface Props {
  initialSubTab?: 'logistics' | 'documents' | 'reconciliation';
}

export const ImportReconciliationReports: React.FC<Props> = ({ initialSubTab = 'logistics' }) => {
  const [subTab, setSubTab] = useState<'logistics' | 'documents' | 'reconciliation'>(initialSubTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [logisticsData, setLogisticsData] = useState<any[]>([]);
  const [documentsData, setDocumentsData] = useState<any[]>([]);
  const [reconciliationData, setReconciliationData] = useState<any[]>([]);
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (subTab === 'logistics') {
        const data = await api.getShipmentLogisticsReport();
        setLogisticsData(Array.isArray(data) ? data : []);
      } else if (subTab === 'documents') {
        const data = await api.getDocumentCompletenessReport();
        setDocumentsData(Array.isArray(data) ? data : []);
      } else if (subTab === 'reconciliation') {
        const data = await api.getImportReconciliationReport();
        setReconciliationData(Array.isArray(data) ? data : []);
      }
    } catch (err: any) {
      setError(formatApiError(err, 'Failed to load report data'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setSubTab('logistics')}
          className={`filter-pill ${subTab === 'logistics' ? 'active' : ''}`}
        >
          <Ship size={14} />
          <span>Shipment & Logistics Report (IMP-45)</span>
        </button>

        <button
          onClick={() => setSubTab('documents')}
          className={`filter-pill ${subTab === 'documents' ? 'active' : ''}`}
        >
          <FileCheck size={14} />
          <span>Document Completeness Report (IMP-46)</span>
        </button>

        <button
          onClick={() => setSubTab('reconciliation')}
          className={`filter-pill ${subTab === 'reconciliation' ? 'active' : ''}`}
        >
          <Layers size={14} />
          <span>Import Reconciliation Matrix (IMP-47)</span>
        </button>

        <button
          onClick={loadData}
          className="btn btn-secondary"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--accent-rose)', borderRadius: '8px', color: 'var(--accent-rose)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ===================== SUBTAB 1: LOGISTICS TRACKING REPORT ===================== */}
      {subTab === 'logistics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Shipments Tracked</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{logisticsData.length}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Forwarders</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.25rem' }}>
                {logisticsData.filter(d => d.selectedForwarderName).length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Vessel Bookings</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {logisticsData.filter(d => d.vesselName || d.bookingReference).length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Insured Shipments</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {logisticsData.filter(d => d.hasInsurance).length}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search shipment, vessel, forwarder..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SHIPMENT #</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CURRENT STAGE</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>FORWARDER</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VESSEL & VOYAGE</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PORTS (ORIGIN → DEST)</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CONTAINERS</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>MILESTONES</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>INSURANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                        <div>Loading logistics report...</div>
                      </td>
                    </tr>
                  ) : logisticsData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No shipment logistics records available.
                      </td>
                    </tr>
                  ) : (
                    logisticsData
                      .filter(row => {
                        const q = search.toLowerCase();
                        return (
                          !q ||
                          row.shipmentNumber?.toLowerCase().includes(q) ||
                          row.selectedForwarderName?.toLowerCase().includes(q) ||
                          row.vesselName?.toLowerCase().includes(q) ||
                          row.bookingReference?.toLowerCase().includes(q)
                        );
                      })
                      .map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {row.shipmentNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className="badge badge-indigo">{row.currentStage?.replace(/_/g, ' ')}</span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {row.selectedForwarderName || <span style={{ color: 'var(--text-muted)' }}>Not Selected</span>}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {row.vesselName ? (
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.vesselName}</div>
                                {row.voyageNumber && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Voy: {row.voyageNumber}</div>}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                            {row.originPort || row.destinationPort ? (
                              <span>{row.originPort || '—'} → {row.destinationPort || '—'}</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: 700 }}>
                            {row.containersCount || 0}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span className={`badge ${row.completedMilestonesCount === row.totalMilestonesCount && row.totalMilestonesCount > 0 ? 'badge-emerald' : 'badge-slate'}`}>
                              {row.completedMilestonesCount || 0} / {row.totalMilestonesCount || 0}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            {row.hasInsurance ? (
                              <span className="badge badge-emerald" title={row.insurancePolicyNumber}>
                                <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} /> Covered
                              </span>
                            ) : (
                              <span className="badge badge-amber">
                                <ShieldAlert size={12} style={{ display: 'inline', marginRight: '4px' }} /> No Policy
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 2: DOCUMENT COMPLETENESS REPORT ===================== */}
      {subTab === 'documents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Required Records</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{documentsData.length}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Verified Documents</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {documentsData.filter(d => d.verificationStatus === 'VERIFIED').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Review</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                {documentsData.filter(d => d.verificationStatus === 'PENDING').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Originals Released</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {documentsData.filter(d => d.originalDocumentStatus === 'RELEASED_TO_AGENT' || d.originalDocumentStatus === 'ENDORSED_TO_BANK').length}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search doc type, shipment, ref..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SHIPMENT #</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DOCUMENT TYPE</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>REFERENCE #</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ISSUE DATE</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFICATION STATUS</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ORIGINAL PAPER STATUS</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VERIFIED BY</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                        <div>Loading document completeness report...</div>
                      </td>
                    </tr>
                  ) : documentsData.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No shipping documents recorded.
                      </td>
                    </tr>
                  ) : (
                    documentsData
                      .filter(row => {
                        const q = search.toLowerCase();
                        return (
                          !q ||
                          row.shipmentNumber?.toLowerCase().includes(q) ||
                          row.documentType?.toLowerCase().includes(q) ||
                          row.documentReference?.toLowerCase().includes(q)
                        );
                      })
                      .map((doc, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {doc.shipmentNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {doc.documentType?.replace(/_/g, ' ')}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {doc.documentReference || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span className={`badge ${doc.verificationStatus === 'VERIFIED' ? 'badge-emerald' : doc.verificationStatus === 'REJECTED' ? 'badge-rose' : 'badge-amber'}`}>
                              {doc.verificationStatus}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span className="badge badge-slate" style={{ fontSize: '0.7rem' }}>
                              {doc.originalDocumentStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {doc.verifiedByEmail || '—'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SUBTAB 3: IMPORT RECONCILIATION MATRIX ===================== */}
      {subTab === 'reconciliation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Explanation Banner */}
          <div style={{ padding: '0.85rem 1.25rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>Import Reconciliation Matrix (IMP-47):</strong> Reconciles commercial commitments vs logistics movement vs warehouse physical receipts.
            Distinguishes <span style={{ color: 'var(--accent-cyan)' }}>Ordered Qty</span> (PO line), <span style={{ color: 'var(--accent-indigo)' }}>Shipped Qty</span> (Bill of Lading line), and <span style={{ color: 'var(--accent-emerald)' }}>Received Qty</span> (physical warehouse GRN).
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Reconciled PO Lines</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{reconciliationData.length}</div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Fully Received Lines</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {reconciliationData.filter(r => r.varianceStatus === 'MATCHED').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Partial / In-Transit</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                {reconciliationData.filter(r => r.varianceStatus === 'UNDER_RECEIVED' || r.varianceStatus === 'IN_TRANSIT').length}
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Not Shipped Yet</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                {reconciliationData.filter(r => r.varianceStatus === 'NOT_SHIPPED').length}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search PO, supplier, item code..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input"
                style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Matrix Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>PO #</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUPPLIER</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ITEM CODE & DESCRIPTION</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ORDERED</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SHIPPED</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>RECEIVED</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>OUTSTANDING</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VARIANCE STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={18} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                        <div>Calculating reconciliation matrix...</div>
                      </td>
                    </tr>
                  ) : reconciliationData.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No purchase order line reconciliation data found.
                      </td>
                    </tr>
                  ) : (
                    reconciliationData
                      .filter(row => {
                        const q = search.toLowerCase();
                        return (
                          !q ||
                          row.poNumber?.toLowerCase().includes(q) ||
                          row.supplierName?.toLowerCase().includes(q) ||
                          row.itemCode?.toLowerCase().includes(q) ||
                          row.itemDescription?.toLowerCase().includes(q)
                        );
                      })
                      .map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {row.poNumber}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {row.supplierName}
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.itemCode}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{row.itemDescription}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                            {Number(row.orderedQuantity || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                            {Number(row.shippedQuantity || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            {Number(row.receivedQuantity || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: Number(row.outstandingQuantity || 0) > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                            {Number(row.outstandingQuantity || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                            <span className={`badge ${
                              row.varianceStatus === 'MATCHED' ? 'badge-emerald' :
                              row.varianceStatus === 'OVER_RECEIVED' ? 'badge-indigo' :
                              row.varianceStatus === 'UNDER_RECEIVED' || row.varianceStatus === 'IN_TRANSIT' ? 'badge-amber' :
                              'badge-rose'
                            }`}>
                              {row.varianceStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

