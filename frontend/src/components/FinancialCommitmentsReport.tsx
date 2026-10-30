import React, { useState, useEffect } from 'react';
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Clock,
  Building2,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import { formatApiError } from '../utils/error';

export const FinancialCommitmentsReport: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFinancialCommitments();
      setData(res);
    } catch (err: any) {
      setError(formatApiError(err, 'Failed to load financial commitments report'));
    } finally {
      setLoading(false);
    }
  };

  const totalCommitted = Number(data?.totalCommitted) || 0;
  const totalPaid = Number(data?.totalPaid) || 0;
  const outstandingBalance = Number(data?.outstandingBalance) || 0;
  const activeLcCount = data?.activeLettersOfCreditCount || 0;

  return (
    <div style={{ marginTop: '1rem' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Cross-PO Financial Commitments & Foreign Currency Liabilities
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Story IMP-22: Track multi-currency milestone payment schedules, outstanding obligations, and active Letters of Credit
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Financials</span>
        </button>
      </div>

      {error && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', borderLeft: '3px solid var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
            <AlertTriangle size={16} />
            <span>Error loading commitment data</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{error}</div>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total Contractual Commitments
            </span>
            <Coins size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ${totalCommitted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Combined milestones across all purchase orders
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Confirmed Disbursed / Paid
            </span>
            <CheckCircle2 size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
            ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Settled remittances and confirmed bank wire transfers
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Outstanding Balance Payable
            </span>
            <AlertTriangle size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
            ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Remaining contractual balance owed to suppliers
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Active Letters of Credit
            </span>
            <FileCheck size={18} color="var(--accent-indigo)" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {activeLcCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Commercial banking instruments currently open
          </div>
        </div>
      </div>

      {/* Milestones Table */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Upcoming Milestone Commitments & Payment Status
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Contractual milestones linked to purchase orders, requiring foreign exchange allocation or bank settlement
            </p>
          </div>
          <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
            {data?.upcomingMilestonesCount || 0} Open Milestones
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>PO Number</th>
                <th style={{ padding: '0.75rem' }}>Supplier</th>
                <th style={{ padding: '0.75rem' }}>Milestone</th>
                <th style={{ padding: '0.75rem' }}>Due Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Amount Due</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Remaining</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading financial commitments...
                  </td>
                </tr>
              ) : (data?.upcomingMilestones || []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No pending payment milestones found. All commitments are paid or settled.
                  </td>
                </tr>
              ) : (
                data?.upcomingMilestones.map((m: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.poNumber || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{m.supplierName || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{m.milestoneName}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'Upon event'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {m.currency} {Number(m.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--accent-emerald)' }}>
                      {m.currency} {Number(m.amountPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber)' }}>
                      {m.currency} {Number(m.remaining).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: m.status === 'OVERDUE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: m.status === 'OVERDUE' ? 'var(--accent-rose)' : 'var(--accent-blue)',
                          fontWeight: 700,
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Letters of Credit Section */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Active Letters of Credit (L/C Portfolio)
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Commercial bank documentary credit instruments tracking latest shipment dates and expiry deadlines
            </p>
          </div>
          <span className="badge badge-outline" style={{ fontSize: '0.75rem' }}>
            {activeLcCount} Active Instruments
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem' }}>L/C Reference</th>
                <th style={{ padding: '0.75rem' }}>PO Number</th>
                <th style={{ padding: '0.75rem' }}>Issuing Bank</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Instrument Amount</th>
                <th style={{ padding: '0.75rem' }}>Issue Date</th>
                <th style={{ padding: '0.75rem' }}>Expiry Date</th>
                <th style={{ padding: '0.75rem' }}>Latest Shipment Date</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading Letters of Credit...
                  </td>
                </tr>
              ) : (data?.activeLettersOfCredit || []).length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No active Letters of Credit found.
                  </td>
                </tr>
              ) : (
                data?.activeLettersOfCredit.map((lc: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700 }}>{lc.lcReference}</td>
                    <td style={{ padding: '0.75rem' }}>{lc.purchaseOrder?.poNumber || '—'}</td>
                    <td style={{ padding: '0.75rem' }}>{lc.issuingBank}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                      {lc.currency} {Number(lc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {lc.issueDate ? new Date(lc.issueDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                      {lc.expiryDate ? new Date(lc.expiryDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                      {lc.latestShipmentDate ? new Date(lc.latestShipmentDate).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          background: 'rgba(99, 102, 241, 0.15)',
                          color: 'var(--accent-indigo)',
                          fontWeight: 700,
                        }}
                      >
                        {lc.status}
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
  );
};

