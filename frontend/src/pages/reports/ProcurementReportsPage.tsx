import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Ship,
  FileSpreadsheet,
  Coins,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Anchor,
  Truck,
  FileCheck,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
} from 'lucide-react';
import { api, ExchangeRateDefault } from '../../api/client';

export const ProcurementReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'po_status' | 'exchange_rates'>('pipeline');
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [poData, setPoData] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateDefault[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<{ currency: string; rate: number } | null>(null);
  const [updatingRate, setUpdatingRate] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadReports = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pipe, po, rates] = await Promise.all([
        api.getShipmentPipelineReport(),
        api.getPOStatusReport(),
        api.getExchangeRates(),
      ]);
      setPipelineData(pipe);
      setPoData(po);
      setExchangeRates(rates || []);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Error';
      setLoadError(message);
      showToast('error', 'Failed to load procurement reports: ' + message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateExchangeRate = async () => {
    if (!editingRate) return;
    setUpdatingRate(true);
    try {
      await api.updateExchangeRate(editingRate.currency, editingRate.rate);
      showToast('success', `Updated baseline exchange rate for ${editingRate.currency} to ${editingRate.rate} ETB`);
      setEditingRate(null);
      const rates = await api.getExchangeRates();
      setExchangeRates(rates);
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to update rate');
    } finally {
      setUpdatingRate(false);
    }
  };

  const stageLabels: Record<string, { label: string; icon: any; color: string }> = {
    ORDERED: { label: 'PO Placed / Ordered', icon: Clock, color: 'var(--text-muted)' },
    SHIPPED: { label: 'Vessel Departed / In Sea Transit', icon: Ship, color: 'var(--accent-blue)' },
    AT_DJIBOUTI_PORT: { label: 'At Port of Djibouti', icon: Anchor, color: 'var(--accent-amber)' },
    ETHIOPIAN_CUSTOMS_CLEARANCE: { label: 'Ethiopian Customs Clearance (Mojo / Kality)', icon: FileCheck, color: 'var(--accent-indigo)' },
    IN_TRANSIT_INLAND: { label: 'In-Transit Inland Highway', icon: Truck, color: 'var(--accent-cyan)' },
    RECEIVED: { label: 'Delivered into KANAB Inventory', icon: CheckCircle2, color: 'var(--accent-emerald)' },
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Logistics & Import</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Procurement</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Pipeline Intelligence & Reports</span>
      </div>

      {loadError && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem', borderLeft: '3px solid var(--accent-rose)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-rose)', fontWeight: 700 }}>
            <AlertTriangle size={16} />
            <span>Report data failed to load</span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            {loadError}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
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
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 0.35rem 0', color: 'var(--text-primary)' }}>
            Procurement & Import Pipeline Intelligence
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Comprehensive reporting for international shipments, customs clearance pipelines, purchase orders, and NBE currency rates
          </p>
        </div>

        <button
          onClick={loadReports}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`filter-pill ${activeTab === 'pipeline' ? 'active' : ''}`}
        >
          <Ship size={15} color={activeTab === 'pipeline' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Shipment Pipeline & Bottlenecks</span>
        </button>

        <button
          onClick={() => setActiveTab('po_status')}
          className={`filter-pill ${activeTab === 'po_status' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={15} color={activeTab === 'po_status' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Purchase Order Fulfillment</span>
        </button>

        <button
          onClick={() => setActiveTab('exchange_rates')}
          className={`filter-pill ${activeTab === 'exchange_rates' ? 'active' : ''}`}
        >
          <Coins size={15} color={activeTab === 'exchange_rates' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Baseline Exchange Rates (NBE)</span>
        </button>
      </div>

      {/* TAB 1: SHIPMENT PIPELINE */}
      {activeTab === 'pipeline' && (
        <div>
          {/* Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Shipments
                </span>
                <Ship size={18} color="var(--accent-blue)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {pipelineData?.totalShipments || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                All international shipments logged
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                  Active in Pipeline
                </span>
                <Clock size={18} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                {pipelineData?.totalActiveShipments || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Pre-arrival & transit stages
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Inland Highway Transit
                </span>
                <Truck size={18} color="var(--accent-cyan)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {pipelineData?.totalInlandTransit || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Djibouti to Addis corridor
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
                  Received into Stock
                </span>
                <CheckCircle2 size={18} color="var(--accent-emerald)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {pipelineData?.stageBreakdown?.RECEIVED || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Landed & VINs registered
              </div>
            </div>
          </div>

          {/* Pipeline Funnel Visualizer */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} color="var(--accent-cyan)" />
              <span>International Logistics Funnel & Stage Bottleneck Distribution</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.keys(stageLabels).map((stageKey) => {
                const count = pipelineData?.stageBreakdown?.[stageKey] || 0;
                const total = pipelineData?.totalShipments || 1;
                const percentage = Math.round((count / (total || 1)) * 100);
                const info = stageLabels[stageKey];
                const IconComponent = info.icon;

                return (
                  <div
                    key={stageKey}
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <IconComponent size={18} color={info.color} />
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {info.label}
                        </span>
                        <span className="badge badge-subtle" style={{ fontSize: '0.7rem' }}>
                          {stageKey}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: info.color }}>
                          {count} {count === 1 ? 'shipment' : 'shipments'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: '45px', textAlign: 'right' }}>
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div
                      style={{
                        height: '6px',
                        borderRadius: '3px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(percentage, 2)}%`,
                          background: info.color,
                          borderRadius: '3px',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Pipeline Shipments Listing */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Recent Pipeline Shipments Tracking
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>SHIPMENT #</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>CURRENT FREIGHT STAGE</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>EXPECTED ARRIVAL</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>PO LINE BATCHES</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>COST VOUCHERS</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineData?.recentShipments?.length > 0 ? (
                    pipelineData.recentShipments.map((s: any) => (
                      <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {s.shipmentNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            className={`badge ${
                              s.currentStage === 'RECEIVED'
                                ? 'badge-emerald'
                                : s.currentStage === 'ETHIOPIAN_CUSTOMS_CLEARANCE'
                                ? 'badge-indigo'
                                : s.currentStage === 'AT_DJIBOUTI_PORT'
                                ? 'badge-amber'
                                : 'badge-subtle'
                            }`}
                          >
                            {s.currentStage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {s.expectedArrivalDate || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-subtle">{s.linesCount} lines</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-subtle">{s.costsCount} vouchers</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No shipments found. Create shipments in the Shipments Tracking section.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDER STATUS (RP2) */}
      {activeTab === 'po_status' && (
        <div>
          {/* PO Metric Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Total Orders
                </span>
                <FileSpreadsheet size={18} color="var(--accent-indigo)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {poData?.totalPOs || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                International & domestic POs
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-cyan)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Total Units Contracted
                </span>
                <Package size={18} color="var(--accent-cyan)" />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {poData?.totalOrderedUnits || 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Vehicles across all lines
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-emerald)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)', textTransform: 'uppercase' }}>
                  USD Commitment
                </span>
                <Coins size={18} color="var(--accent-emerald)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                ${(poData?.currencyTotals?.USD || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Overseas factory commitments
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-amber)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                  ETB Commitment
                </span>
                <Coins size={18} color="var(--accent-amber)" />
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                ETB {(poData?.currencyTotals?.ETB || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Local assembly & freight
              </div>
            </div>
          </div>

          {/* Status Breakdown Bar */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Purchase Order Lifecycle Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(poData?.statusCounts || {}).map(([statusKey, count]: any) => (
                <div
                  key={statusKey}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid var(--border-color)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                    {statusKey.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PO List Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Recent Purchase Orders Status
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>PO #</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>SUPPLIER</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>DATE</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'right' }}>TOTAL AMOUNT</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>LINES</th>
                    <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {poData?.recentPOs?.length > 0 ? (
                    poData.recentPOs.map((p: any) => (
                      <tr key={p.poId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {p.poNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                          {p.supplierName}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {p.poDate || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                          {p.currency} {p.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span className="badge badge-subtle">{p.linesCount} lines</span>
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              p.status === 'CONFIRMED'
                                ? 'badge-emerald'
                                : p.status === 'DRAFT'
                                ? 'badge-amber'
                                : p.status === 'CANCELLED'
                                ? 'badge-rose'
                                : 'badge-indigo'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No purchase orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXCHANGE RATES (F3) */}
      {activeTab === 'exchange_rates' && (
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Multi-Currency Baseline Exchange Rates (ETB Conversion)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Pre-configured baseline conversion rates to ETB for automated landed cost computation snapshots.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {exchangeRates.map((rate) => (
                <div
                  key={rate.currency}
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(15, 23, 42, 0.5)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-indigo" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {rate.currency}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>1 {rate.currency} =</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(rate.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                      {Number(rate.rateToEtb).toFixed(4)}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ETB
                    </span>
                  </div>

                  {editingRate?.currency === rate.currency ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="number"
                        step="0.0001"
                        value={editingRate.rate}
                        onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) || 0 })}
                        className="input"
                        style={{ flex: 1 }}
                      />
                      <button
                        onClick={handleUpdateExchangeRate}
                        disabled={updatingRate}
                        className="btn btn-primary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        {updatingRate ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingRate(null)}
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingRate({ currency: rate.currency, rate: Number(rate.rateToEtb) })}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem', width: '100%', marginTop: '0.25rem' }}
                    >
                      Update Default Rate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
