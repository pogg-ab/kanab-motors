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
  AlertCircle,
  Truck,
  Building,
  Users,
} from 'lucide-react';
import { api, DashboardSummary } from '../../api/client';

interface DashboardPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigateTab }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch {
      // Fallback defaults
      setSummary({
        todays_sales: 0,
        todays_invoice_count: 0,
        vehicles_available: 0,
        vehicles_reserved: 0,
        vehicles_allotted: 0,
        vehicles_sold: 0,
        vehicles_delivered: 0,
        pending_approvals: 0,
        pending_allotments: 0,
        total_invoiced: 0,
        total_collected: 0,
        total_receivables: 0,
        active_confirmed_bookings: 0,
        open_enquiries: 0,
        active_customers: 0,
        active_shipments: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatETB = (val?: number) => {
    return (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ETB';
  };

  const totalVehicles =
    (Number(summary?.vehicles_available) || 0) +
    (Number(summary?.vehicles_reserved) || 0) +
    (Number(summary?.vehicles_allotted) || 0) +
    (Number(summary?.vehicles_sold) || 0) +
    (Number(summary?.vehicles_delivered) || 0);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <LayoutDashboard className="text-cyan" size={28} />
            Executive & Management Dashboard
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            KMSICAMS-7 • Real-time operational intelligence across Sales, Inventory, Finance & Governance
          </p>
        </div>
        <button
          onClick={loadDashboard}
          disabled={loading}
          style={{
            padding: '0.6rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Live Data
        </button>
      </div>

      {/* Top Hero KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Today's Sales */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(0, 210, 211, 0.15), rgba(15, 23, 42, 0.6))',
            border: '1px solid rgba(0, 210, 211, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>TODAY'S APPROVED SALES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem', color: '#00D2D3' }}>
                {formatETB(summary?.todays_sales)}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(0, 210, 211, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00D2D3',
              }}
            >
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Invoices issued today: <strong style={{ color: '#FFF' }}>{summary?.todays_invoice_count || 0}</strong>
          </div>
        </div>

        {/* Fleet Ready for Sale */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.6))',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>VEHICLES AVAILABLE FOR SALE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem', color: '#10B981' }}>
                {summary?.vehicles_available || 0} Units
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10B981',
              }}
            >
              <CarFront size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Total active fleet tracked: <strong style={{ color: '#FFF' }}>{totalVehicles}</strong>
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.6))',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>PENDING APPROVALS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem', color: '#F59E0B' }}>
                {summary?.pending_approvals || 0}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F59E0B',
              }}
            >
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Awaiting manager sign-off in unified queue
          </div>
        </div>

        {/* Net Receivables */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(15, 23, 42, 0.6))',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>NET CUSTOMER RECEIVABLES</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.35rem', color: '#A855F7' }}>
                {formatETB(summary?.total_receivables)}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'rgba(168, 85, 247, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#A855F7',
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
            Total ledger debits less cash collections
          </div>
        </div>
      </div>

      {/* Middle Grid: Fleet Status & Financial Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* Vehicle Lifecycle Status Distribution */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CarFront size={18} className="text-cyan" />
              Fleet Lifecycle Distribution
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total: {totalVehicles} units</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { label: 'AVAILABLE FOR SALE', count: summary?.vehicles_available || 0, color: '#10B981' },
              { label: 'RESERVED (BOOKINGS)', count: summary?.vehicles_reserved || 0, color: '#F59E0B' },
              { label: 'ALLOTTED (VIN ASSIGNED)', count: summary?.vehicles_allotted || 0, color: '#00D2D3' },
              { label: 'SOLD (INVOICED)', count: summary?.vehicles_sold || 0, color: '#8B5CF6' },
              { label: 'DELIVERED (GATE PASS)', count: summary?.vehicles_delivered || 0, color: '#3B82F6' },
            ].map((st, i) => {
              const pct = totalVehicles > 0 ? ((Number(st.count) / totalVehicles) * 100).toFixed(1) : '0';
              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{st.label}</span>
                    <span>
                      <strong>{st.count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: st.color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Health Summary */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.25rem',
          }}
        >
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={18} className="text-cyan" />
            Financial Engine Ledger Health
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>TOTAL INVOICED REVENUE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF', marginTop: '0.2rem' }}>
                  {formatETB(summary?.total_invoiced)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CASH COLLECTED (BRV)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981', marginTop: '0.2rem' }}>
                  {formatETB(summary?.total_collected)}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>CONFIRMED BOOKINGS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00D2D3', marginTop: '0.2rem' }}>
                  {summary?.active_confirmed_bookings || 0}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>OPEN SALES ENQUIRIES</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.2rem' }}>
                  {summary?.open_enquiries || 0}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ACTIVE CUSTOMERS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#A855F7', marginTop: '0.2rem' }}>
                  {summary?.active_customers || 0}
                </div>
              </div>

              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>IMPORT SHIPMENTS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3B82F6', marginTop: '0.2rem' }}>
                  {summary?.active_shipments || 0} In Transit
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Operational Shortcuts */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
          Operational Workflows & Quick Shortcuts
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Approval Queue', tab: 'approvals', count: summary?.pending_approvals, icon: ShieldCheck, color: '#F59E0B' },
            { label: 'Vehicle Allotments', tab: 'allotments', count: summary?.pending_allotments, icon: CarFront, color: '#00D2D3' },
            { label: 'Sales Invoices', tab: 'invoices', count: summary?.todays_invoice_count, icon: Receipt, color: '#10B981' },
            { label: 'Delivery & PDI', tab: 'deliveries', count: summary?.vehicles_allotted, icon: Truck, color: '#3B82F6' },
            { label: 'Inventory & Warehouses', tab: 'inventory', count: summary?.vehicles_available, icon: Boxes, color: '#A855F7' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={i}
                onClick={() => onNavigateTab && onNavigateTab(item.tab)}
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Icon size={18} style={{ color: item.color }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.count !== undefined ? `${item.count} items active` : 'Manage module'}
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
