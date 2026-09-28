import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  CarFront,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Boxes,
  ArrowRight,
  RefreshCw,
  Calendar,
  Layers,
  Building,
  Users,
  Download,
  Check,
  Coins,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  api,
  ManagementDashboardSummary,
  SalesCrossTabItem,
} from '../../api/client';

interface DashboardPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [summary, setSummary] = useState<ManagementDashboardSummary | null>(null);
  const [crossTab, setCrossTab] = useState<SalesCrossTabItem[]>([]);

  useEffect(() => {
    applyPreset('today');
  }, []);

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      fetchData(todayStr, todayStr);
    } else if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      const startStr = start.toISOString().split('T')[0];
      setStartDate(startStr);
      setEndDate(todayStr);
      fetchData(startStr, todayStr);
    } else if (preset === 'month') {
      const startStr = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setStartDate(startStr);
      setEndDate(todayStr);
      fetchData(startStr, todayStr);
    }
  };

  const fetchData = async (sDate: string, eDate: string) => {
    setLoading(true);
    try {
      const [sum, ct] = await Promise.all([
        api.getManagementDashboardSummary({ startDate: sDate, endDate: eDate }).catch(() => null),
        api.getSalesPerformanceCrossTab({ startDate: sDate, endDate: eDate }).catch(() => []),
      ]);

      if (sum) setSummary(sum);
      if (ct) setCrossTab(ct);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(startDate, endDate);
  };

  const formatETB = (val?: number | string) => {
    const num = Number(val) || 0;
    return (
      num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ETB'
    );
  };

  const exportCrossTabCSV = () => {
    if (!crossTab.length) return;
    const headers = ['Salesperson', 'Model', 'Product Name', 'Invoice Count', 'Units Sold', 'Total Sales (ETB)'];
    const rows = crossTab.map((r) => [
      r.salesperson_name,
      r.model || 'Standard',
      `"${r.item_name}"`,
      r.invoice_count,
      r.units_sold,
      r.total_sales,
    ]);
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sales_performance_cross_tab_${startDate}_to_${endDate}.csv`;
    link.click();
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Breadcrumb & Header matching SOA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Executive Intelligence</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Overview</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Management Dashboard</span>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutDashboard style={{ color: 'var(--accent-cyan)' }} size={28} />
            Management Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Executive Overview with 13 Cross-Module KPIs & Sales Performance Matrix
          </p>
        </div>
      </div>

      {/* Date Filter Bar Card */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Period:
            </label>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.2rem',
              }}
            >
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id as any)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: datePreset === p.id ? 'var(--accent-cyan)' : 'transparent',
                    color: datePreset === p.id ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: datePreset === p.id ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <form onSubmit={handleCustomDateSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="input-field"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ height: '36px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>to</span>
                <input
                  type="date"
                  className="input-field"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ height: '36px', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                />
                <button
                  type="submit"
                  className="btn btn-cyan"
                  style={{ height: '36px', padding: '0 0.85rem', fontSize: '0.8rem' }}
                >
                  Apply
                </button>
              </form>
            )}
          </div>

          <button
            onClick={() => fetchData(startDate, endDate)}
            disabled={loading}
            className="btn btn-secondary"
            style={{ height: '36px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* SECTION 1: CORE OPERATIONAL KPIs */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
          <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
            Period Sales & Physical Fleet Inventory
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ({startDate} to {endDate})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {/* Tile 1: Total Sales */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TOTAL PERIOD SALES</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-cyan)' }}>
              {formatETB(summary?.total_sales)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Invoices approved: <strong style={{ color: 'var(--text-primary)' }}>{summary?.invoice_count || 0}</strong>
            </div>
          </div>

          {/* Tile 2: Available Inventory */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>AVAILABLE INVENTORY</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-emerald)' }}>
              {summary?.vehicles_available || 0} Units
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
              Status: AVAILABLE_FOR_SALE
            </div>
          </div>

          {/* Tile 3: Reserved Inventory */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>RESERVED INVENTORY</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-amber)' }}>
              {summary?.vehicles_reserved || 0} Units
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Status: RESERVED for Bookings
            </div>
          </div>

          {/* Tile 4: Vehicles Awaiting Allotment */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PENDING ALLOTMENTS</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-purple)' }}>
              {summary?.pending_allotment_requests || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Requests awaiting approval
            </div>
          </div>

          {/* Tile 5: Vehicles Ready for Delivery */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>READY FOR DELIVERY</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-blue)' }}>
              {summary?.vehicles_ready_for_delivery || 0} Units
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
              PDI completed & cleared
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: THE 7 LINKED FINANCIAL & BOOKING KPIs */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)' }} />
            <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
              Customer Accounts, Bookings & Financial Ledger KPIs
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Live Integrated Enterprise Financial & Operations Data
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Tile 1: Total Bookings */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>TOTAL BOOKINGS</span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                BOOKINGS
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
              {summary?.total_bookings || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Bookings in selected period
            </div>
          </div>

          {/* Tile 2: Total Customer Deposits */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>CUSTOMER DEPOSITS</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                PAYMENTS
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-emerald)' }}>
              {formatETB(summary?.total_customer_deposits)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Bank receipts in period
            </div>
          </div>

          {/* Tile 3: Outstanding Customer Balance */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>OUTSTANDING BALANCE</span>
              <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>
                LEDGER
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-rose)' }}>
              {formatETB(summary?.outstanding_customer_balance)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Net receivables uncollected
            </div>
          </div>

          {/* Tile 4: Customer Credit Balance */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>AVAILABLE CREDIT</span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                CREDIT
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-purple)' }}>
              {formatETB(summary?.customer_credit_balance)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Customer unallocated credit
            </div>
          </div>

          {/* Tile 5: Excess Payments */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>EXCESS PAYMENTS</span>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
                EXCESS
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-amber)' }}>
              {formatETB(summary?.excess_payments)}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Overpayments routed in period
            </div>
          </div>

          {/* Tile 6: Pending Refunds */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PENDING REFUNDS</span>
              <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>
                REFUNDS
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-rose)' }}>
              {summary?.pending_refunds || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Awaiting payout authorization
            </div>
          </div>

          {/* Tile 7: Processed Refunds */}
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>PROCESSED REFUNDS</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                REFUNDS
              </span>
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--accent-emerald)' }}>
              {summary?.processed_refunds || 0}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Refund settlements closed
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: SALES PERFORMANCE CROSS-TAB */}
      <div className="card" style={{ padding: '1.25rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
              <Users size={18} style={{ color: 'var(--accent-cyan)' }} />
              Sales Performance Matrix: Product × Salesperson
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Cross-dimensional sales analysis and revenue distribution by salesperson and vehicle model
            </div>
          </div>

          <button
            onClick={exportCrossTabCSV}
            disabled={!crossTab.length}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Download size={14} /> Export Matrix CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SALESPERSON</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MODEL</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PRODUCT ITEM</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICES</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS SOLD</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SALES REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No product × salesperson sales recorded for this date period ({startDate} to {endDate}).
                  </td>
                </tr>
              ) : (
                crossTab.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.salesperson_name}</td>
                    <td style={{ padding: '0.85rem 1.15rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{row.model || 'Standard'}</td>
                    <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{row.item_name}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{row.invoice_count}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{row.units_sold}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {formatETB(row.total_sales)}
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
