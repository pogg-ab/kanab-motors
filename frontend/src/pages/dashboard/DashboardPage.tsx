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
import { formatApiError } from '../../utils/error';

interface DashboardPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customStartDate, setCustomStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateError, setDateError] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');

  const [summary, setSummary] = useState<ManagementDashboardSummary | null>(null);
  const [crossTab, setCrossTab] = useState<SalesCrossTabItem[]>([]);

  useEffect(() => {
    applyPreset('today');
  }, []);

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'custom') => {
    setDatePreset(preset);
    setDateError('');
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
      fetchData(todayStr, todayStr);
    } else if (preset === 'week') {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday
      const startStr = start.toISOString().split('T')[0];
      setStartDate(startStr);
      setEndDate(todayStr);
      setCustomStartDate(startStr);
      setCustomEndDate(todayStr);
      fetchData(startStr, todayStr);
    } else if (preset === 'month') {
      const startStr = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      setStartDate(startStr);
      setEndDate(todayStr);
      setCustomStartDate(startStr);
      setCustomEndDate(todayStr);
      fetchData(startStr, todayStr);
    } else {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
    }
  };

  const fetchData = async (sDate: string, eDate: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const [sum, ct] = await Promise.all([
        api.getManagementDashboardSummary({ startDate: sDate, endDate: eDate }),
        api.getSalesPerformanceCrossTab({ startDate: sDate, endDate: eDate }),
      ]);

      setSummary(sum);
      setCrossTab(ct);
    } catch (error) {
      console.error('Failed to load management dashboard data', error);
      setLoadError(formatApiError(error, 'Could not apply the selected filters. Please refresh and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStartDate || !customEndDate) {
      setDateError('Choose both start and end dates.');
      return;
    }
    if (customStartDate > customEndDate) {
      setDateError('Start date must be before or equal to end date.');
      return;
    }

    setDateError('');
    setStartDate(customStartDate);
    setEndDate(customEndDate);
    fetchData(customStartDate, customEndDate);
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

  const moneyChartRows = [
    { label: 'Sales Revenue', value: Number(summary?.total_sales || 0), color: 'var(--accent-cyan)' },
    { label: 'Customer Deposits', value: Number(summary?.total_customer_deposits || 0), color: 'var(--accent-emerald)' },
    { label: 'Outstanding Receivables', value: Number(summary?.outstanding_customer_balance || 0), color: 'var(--accent-rose)' },
    { label: 'Customer Credit', value: Number(summary?.customer_credit_balance || 0), color: 'var(--accent-purple)' },
    { label: 'Excess Overpayments', value: Number(summary?.excess_payments || 0), color: 'var(--accent-amber)' },
  ];
  const moneyChartMax = Math.max(...moneyChartRows.map((row) => row.value), 1);

  const fleetChartRows = [
    { label: 'Available Stock', value: Number(summary?.vehicles_available || 0), color: 'var(--accent-emerald)' },
    { label: 'Reserved for Bookings', value: Number(summary?.vehicles_reserved || 0), color: 'var(--accent-amber)' },
    { label: 'Pending Allotments', value: Number(summary?.pending_allotment_requests || 0), color: 'var(--accent-purple)' },
    { label: 'Ready for Delivery', value: Number(summary?.vehicles_ready_for_delivery || 0), color: 'var(--accent-cyan)' },
  ];
  const fleetChartMax = Math.max(...fleetChartRows.map((row) => row.value), 1);
  const matrixChartMax = Math.max(...crossTab.map((row) => Number(row.total_sales || 0)), 1);

  const DashboardBar = ({ label, value, max, color, amount = false }: { label: string; value: number; max: number; color: string; amount?: boolean }) => {
    const width = Math.max(value > 0 ? 5 : 0, Math.min(100, (value / max) * 100));
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: color }}>
            {amount ? formatETB(value) : `${value.toLocaleString('en-US')} units`}
          </span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: '999px', transition: 'width 0.4s ease' }} />
        </div>
      </div>
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
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Executive Intelligence</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Analytics & Performance</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Executive Management Dashboard</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                Executive Management Dashboard
              </h1>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Real-time executive oversight, cross-module financial intelligence & sales performance analytics
              </div>
            </div>
          </div>

          {/* Date Filter Bar & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.25rem',
                gap: '0.25rem',
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
                  className={datePreset === p.id ? 'btn btn-cyan' : 'btn btn-secondary'}
                  style={{
                    padding: '0.35rem 0.8rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-sm)',
                    border: datePreset === p.id ? 'none' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <form onSubmit={handleCustomDateSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${dateError ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${dateError ? 'var(--accent-rose)' : 'var(--border-color)'}`,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-cyan"
                  style={{
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Applying...' : 'Apply'}
                </button>
                {dateError && (
                  <span style={{ color: 'var(--accent-rose)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {dateError}
                  </span>
                )}
              </form>
            )}

            <button
              onClick={() => fetchData(startDate, endDate)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.35)',
            color: 'var(--accent-rose)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {loadError}
        </div>
      )}

      {/* SECTION 1: Period Sales & Physical Fleet Inventory */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)', boxShadow: '0 0 10px var(--accent-cyan)' }} />
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Period Sales & Physical Fleet Inventory
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(15, 23, 42, 0.6)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            Active Filter: <strong style={{ color: 'var(--accent-cyan)' }}>{startDate}</strong> to <strong style={{ color: 'var(--accent-cyan)' }}>{endDate}</strong>
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Tile 1: Total Sales */}
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total Period Sales
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {formatETB(summary?.total_sales)}
                </div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(6, 182, 212, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Approved invoices: <strong style={{ color: 'var(--text-primary)' }}>{summary?.invoice_count || 0}</strong>
            </div>
          </div>

          {/* Tile 2: Available Inventory */}
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Available Fleet Stock
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {(summary?.vehicles_available || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Units</span>
                </div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--accent-emerald)' }}>
                <CarFront size={20} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Immediate delivery available
            </div>
          </div>

          {/* Tile 3: Reserved Inventory */}
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reserved Inventory
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {(summary?.vehicles_reserved || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Units</span>
                </div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(245, 158, 11, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--accent-amber)' }}>
                <Clock size={20} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Locked for verified bookings
            </div>
          </div>

          {/* Tile 4: Vehicles Awaiting Allotment */}
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-purple)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pending Allotments
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {(summary?.pending_allotment_requests || 0).toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(168, 85, 247, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--accent-purple)' }}>
                <Layers size={20} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Requests awaiting approval
            </div>
          </div>

          {/* Tile 5: Vehicles Ready for Delivery */}
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ready for Delivery
                </div>
                <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
                  {(summary?.vehicles_ready_for_delivery || 0).toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Units</span>
                </div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(6, 182, 212, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)' }}>
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              PDI completed & gate pass ready
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Customer Accounts, Bookings & Financial Ledgers */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)', boxShadow: '0 0 10px var(--accent-amber)' }} />
            <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Customer Accounts, Bookings & Financial Ledgers
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Live figures consolidated from Customer Ledgers, Booking Orders & Settlements
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {/* Total Bookings */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Bookings</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>ORDERS</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {(summary?.total_bookings || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Created in selected period
            </div>
          </div>

          {/* Customer Deposits */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Deposits</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>PAYMENTS</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
              {formatETB(summary?.total_customer_deposits)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Confirmed period deposits
            </div>
          </div>

          {/* Outstanding Balance */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-rose)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Balance</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>RECEIVABLES</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
              {formatETB(summary?.outstanding_customer_balance)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Unsettled invoice balance
            </div>
          </div>

          {/* Available Credit */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-purple)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Credit</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.1)', color: 'var(--accent-purple)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>CREDIT</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-purple)' }}>
              {formatETB(summary?.customer_credit_balance)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Unallocated client credits
            </div>
          </div>

          {/* Excess Payments */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Excess Overpayments</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>OVERPAID</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-amber)' }}>
              {formatETB(summary?.excess_payments)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Awaiting credit/refund routing
            </div>
          </div>

          {/* Pending Refunds */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-rose)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Refunds</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>QUEUE</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
              {(summary?.pending_refunds || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Awaiting finance authorization
            </div>
          </div>

          {/* Processed Refunds */}
          <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Processed Refunds</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700 }}>FINALIZED</span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.4rem', fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
              {(summary?.processed_refunds || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Disbursed in selected period
            </div>
          </div>
        </div>
      </div>

      {/* VISUAL EXECUTIVE SUMMARY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', background: 'rgba(6, 182, 212, 0.12)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)' }}>
                <TrendingUp size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Financial KPI Distribution</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Period Total</span>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {moneyChartRows.map((row) => (
              <DashboardBar key={row.label} label={row.label} value={row.value} max={moneyChartMax} color={row.color} amount />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', background: 'rgba(16, 185, 129, 0.12)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)' }}>
                <CarFront size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Fleet & Inventory Capacity</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Count</span>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {fleetChartRows.map((row) => (
              <DashboardBar key={row.label} label={row.label} value={row.value} max={fleetChartMax} color={row.color} />
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ padding: '0.45rem', background: 'rgba(168, 85, 247, 0.12)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-purple)' }}>
                <Users size={18} />
              </div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Sales Performance by Rep</span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Revenue (ETB)</span>
          </div>
          {crossTab.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No salesperson revenue in this period.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {crossTab.slice(0, 6).map((row, index) => (
                <DashboardBar
                  key={`${row.salesperson_name}-${row.item_name}-${index}`}
                  label={`${row.salesperson_name} (${row.model || 'Standard'})`}
                  value={Number(row.total_sales || 0)}
                  max={matrixChartMax}
                  color={['var(--accent-cyan)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-purple)', '#38bdf8', 'var(--accent-rose)'][index % 6]}
                  amount
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: Sales Performance Cross-Tab Matrix */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(15, 23, 42, 0.4)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(6, 182, 212, 0.12)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-cyan)' }}>
              <Users size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Sales Performance Matrix: Product × Salesperson
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Live cross-dimensional sales distribution by vehicle model and account representative
              </div>
            </div>
          </div>

          <button
            onClick={exportCrossTabCSV}
            disabled={!crossTab.length}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}
          >
            <Download size={14} /> Export Matrix CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SALESPERSON</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>MODEL</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PRODUCT ITEM</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>INVOICES</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>UNITS SOLD</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>TOTAL SALES REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No product × salesperson sales recorded for this date period ({startDate} to {endDate}).
                  </td>
                </tr>
              ) : (
                crossTab.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.salesperson_name}</td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>{row.model || 'Standard'}</td>
                    <td style={{ padding: '0.9rem 1.25rem', color: 'var(--text-secondary)' }}>{row.item_name}</td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontFamily: 'monospace' }}>{row.invoice_count}</td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{row.units_sold}</td>
                    <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
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
