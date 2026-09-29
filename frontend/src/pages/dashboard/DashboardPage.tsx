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
      setLoadError('Could not apply the selected filters. Please refresh and try again.');
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
    { label: 'Sales', value: Number(summary?.total_sales || 0), color: '#00D2D3' },
    { label: 'Deposits', value: Number(summary?.total_customer_deposits || 0), color: '#10B981' },
    { label: 'Outstanding', value: Number(summary?.outstanding_customer_balance || 0), color: '#EF4444' },
    { label: 'Credit', value: Number(summary?.customer_credit_balance || 0), color: '#A855F7' },
    { label: 'Excess', value: Number(summary?.excess_payments || 0), color: '#F59E0B' },
  ];
  const moneyChartMax = Math.max(...moneyChartRows.map((row) => row.value), 1);

  const fleetChartRows = [
    { label: 'Available', value: Number(summary?.vehicles_available || 0), color: '#10B981' },
    { label: 'Reserved', value: Number(summary?.vehicles_reserved || 0), color: '#F59E0B' },
    { label: 'Pending Allotments', value: Number(summary?.pending_allotment_requests || 0), color: '#A855F7' },
    { label: 'Ready Delivery', value: Number(summary?.vehicles_ready_for_delivery || 0), color: '#3B82F6' },
  ];
  const fleetChartMax = Math.max(...fleetChartRows.map((row) => row.value), 1);
  const matrixChartMax = Math.max(...crossTab.map((row) => Number(row.total_sales || 0)), 1);

  const DashboardBar = ({ label, value, max, color, amount = false }: { label: string; value: number; max: number; color: string; amount?: boolean }) => {
    const width = Math.max(value > 0 ? 6 : 0, (value / max) * 100);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
          <span style={{ fontWeight: 700 }}>{label}</span>
          <span style={{ color: 'var(--text-secondary)' }}>{amount ? formatETB(value) : value.toLocaleString('en-US')}</span>
        </div>
        <div style={{ height: '11px', background: 'rgba(148, 163, 184, 0.14)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: '999px' }} />
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
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header with Date-Range Controls (Story F1) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutDashboard className="text-cyan" size={28} />
            Management Dashboard
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            KMSICAMS-8 (SRS §8.18) • Real-time Executive Overview with 13 Cross-Module KPIs & Sales Matrix
          </p>
        </div>

        {/* Date Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  background: datePreset === p.id ? '#00D2D3' : 'transparent',
                  color: datePreset === p.id ? '#0D1117' : 'var(--text-secondary)',
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
            <form onSubmit={handleCustomDateSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: `1px solid ${dateError ? '#EF4444' : 'var(--border-color)'}`,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
              <span style={{ color: 'var(--text-secondary)' }}>to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  border: `1px solid ${dateError ? '#EF4444' : 'var(--border-color)'}`,
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8rem',
                }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  background: loading ? 'rgba(148, 163, 184, 0.35)' : '#00D2D3',
                  color: '#0D1117',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Applying...' : 'Apply'}
              </button>
              {dateError && (
                <span style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600 }}>
                  {dateError}
                </span>
              )}
            </form>
          )}

          <button
            onClick={() => fetchData(startDate, endDate)}
            disabled={loading}
            style={{
              padding: '0.45rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#EF4444',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {loadError}
        </div>
      )}

      {/* SECTION 1: CORE BUILDABLE OPERATIONAL KPIs (6 Tiles - Stories K1-K6, F2) */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00D2D3' }} />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Period Sales & Physical Fleet Inventory (K1–K6)
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            ({startDate} to {endDate})
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          {/* Tile 1: Total Sales */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(0, 210, 211, 0.4)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>TOTAL PERIOD SALES</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#00D2D3' }}>
              {formatETB(summary?.total_sales)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Invoices approved: <strong>{summary?.invoice_count || 0}</strong>
            </div>
          </div>

          {/* Tile 2: Available Inventory */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>AVAILABLE INVENTORY</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#10B981' }}>
              {summary?.vehicles_available || 0} Units
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Status: AVAILABLE_FOR_SALE
            </div>
          </div>

          {/* Tile 3: Reserved Inventory */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>RESERVED INVENTORY</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#F59E0B' }}>
              {summary?.vehicles_reserved || 0} Units
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Status: RESERVED for Bookings
            </div>
          </div>

          {/* Tile 4: Vehicles Awaiting Allotment */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>PENDING ALLOTMENTS</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#A855F7' }}>
              {summary?.pending_allotment_requests || 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Requests awaiting approval
            </div>
          </div>

          {/* Tile 5: Vehicles Ready for Delivery (Story F2) */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>READY FOR DELIVERY</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#3B82F6' }}>
              {summary?.vehicles_ready_for_delivery || 0} Units
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              PDI completed & cleared
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CUSTOMER, BOOKING & FINANCIAL KPIs (Stories G1, G2) */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }} />
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customer Accounts, Bookings & Financial Ledger KPIs (7 Tiles)
            </h2>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Live values from Booking, Payment, Ledger, Credit, and Refund modules.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(0, 210, 211, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>TOTAL BOOKINGS</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(0, 210, 211, 0.1)', color: '#00D2D3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                BOOKINGS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#FFF' }}>
              {summary?.total_bookings || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Bookings created in selected period
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>CUSTOMER DEPOSITS</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                PAYMENTS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#10B981' }}>
              {formatETB(summary?.total_customer_deposits)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Confirmed deposits in selected period
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>OUTSTANDING BALANCE</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                LEDGER
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#EF4444' }}>
              {formatETB(summary?.outstanding_customer_balance)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Ledger receivable up to end date
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>AVAILABLE CREDIT</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.1)', color: '#A855F7', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                CREDIT
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#A855F7' }}>
              {formatETB(summary?.customer_credit_balance)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Current customer unallocated credit
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>EXCESS PAYMENTS</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                EXCESS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#F59E0B' }}>
              {formatETB(summary?.excess_payments)}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Current excess payment balance
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>PENDING REFUNDS</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                REFUNDS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#EF4444' }}>
              {summary?.pending_refunds || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Requested, reviewed, or approved in period
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: '10px',
              padding: '1.15rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>PROCESSED REFUNDS</span>
              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                REFUNDS
              </span>
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, marginTop: '0.35rem', color: '#10B981' }}>
              {summary?.processed_refunds || 0}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Finance processed or confirmed in period
            </div>
          </div>
        </div>
      </div>
      {/* VISUAL EXECUTIVE SUMMARY */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            <TrendingUp size={18} className="text-cyan" /> Financial KPI Chart
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {moneyChartRows.map((row) => (
              <DashboardBar key={row.label} label={row.label} value={row.value} max={moneyChartMax} color={row.color} amount />
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            <CarFront size={18} className="text-cyan" /> Fleet KPI Chart
          </div>
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {fleetChartRows.map((row) => (
              <DashboardBar key={row.label} label={row.label} value={row.value} max={fleetChartMax} color={row.color} />
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontWeight: 800 }}>
            <Users size={18} className="text-cyan" /> Salesperson Revenue Chart
          </div>
          {crossTab.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No salesperson revenue in this period.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {crossTab.slice(0, 6).map((row, index) => (
                <DashboardBar
                  key={`${row.salesperson_name}-${row.item_name}-${index}`}
                  label={`${row.salesperson_name} / ${row.model || 'Standard'}`}
                  value={Number(row.total_sales || 0)}
                  max={matrixChartMax}
                  color={['#00D2D3', '#10B981', '#F59E0B', '#A855F7', '#3B82F6', '#EF4444'][index % 6]}
                  amount
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3: SALES PERFORMANCE CROSS-TAB (PRODUCT × SALESPERSON) (Story F3) */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} className="text-cyan" />
              Sales Performance Matrix: Product × Salesperson (Story F3)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Cross-dimensional sales analysis computed live by <code style={{ color: '#00D2D3' }}>fn_sales_performance_by_product_and_salesperson()</code>
            </div>
          </div>

          <button
            onClick={exportCrossTabCSV}
            disabled={!crossTab.length}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Download size={14} /> Export Matrix CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem' }}>SALESPERSON</th>
                <th style={{ padding: '0.85rem 1rem' }}>MODEL</th>
                <th style={{ padding: '0.85rem 1rem' }}>PRODUCT ITEM</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICES</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS SOLD</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL SALES REVENUE</th>
              </tr>
            </thead>
            <tbody>
              {crossTab.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No product × salesperson sales recorded for this date period ({startDate} to {endDate}).
                  </td>
                </tr>
              ) : (
                crossTab.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{row.salesperson_name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#00D2D3', fontWeight: 700 }}>{row.model || 'Standard'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{row.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{row.invoice_count}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{row.units_sold}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>
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

