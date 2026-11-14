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
  Download,
  Activity,
  Search,
} from 'lucide-react';
import { api, ExchangeRateDefault } from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { formatApiError } from '../../utils/error';
import { FinancialCommitmentsReport } from '../../components/FinancialCommitmentsReport';
import { ImportReconciliationReports } from '../../components/ImportReconciliationReports';

export const ProcurementReportsPage: React.FC = () => {
  const { can, any } = usePermissions();
  const canManageExchangeRates = can('EXCHANGE_RATES_MANAGE');
  const canExportReports = any(['REPORTS_EXPORT', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW']);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'monitoring' | 'po_status' | 'exchange_rates' | 'commitments' | 'reconciliation_reports'>('pipeline');
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [poData, setPoData] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateDefault[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<{ currency: string; rate: number } | null>(null);
  const [newCurrencyCode, setNewCurrencyCode] = useState<string>('');
  const [newCurrencyRate, setNewCurrencyRate] = useState<number>(0);
  const [updatingRate, setUpdatingRate] = useState<boolean>(false);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Pipeline Filters (IMP-43)
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterBusinessUnit, setFilterBusinessUnit] = useState<string>('');
  const [filterSupplier, setFilterSupplier] = useState<string>('');
  const [filterDestination, setFilterDestination] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const buildPipelineParams = () => ({
    search: filterSearch || undefined,
    businessUnit: filterBusinessUnit || undefined,
    supplier: filterSupplier || undefined,
    destination: filterDestination || undefined,
    status: filterStatus || undefined,
    startDate: filterStartDate || undefined,
    endDate: filterEndDate || undefined,
  });

  useEffect(() => {
    loadReports();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadReports = async (overrideParams?: any) => {
    setLoading(true);
    setLoadError(null);
    try {
      const pipeParams = overrideParams !== undefined ? overrideParams : buildPipelineParams();
      const [pipe, po, rates, monitoring] = await Promise.all([
        api.getShipmentPipelineReport(pipeParams),
        api.getPOStatusReport(),
        api.getExchangeRates(),
        api.getImportMonitoringDashboard().catch(() => null),
      ]);
      setPipelineData(pipe);
      setPoData(po);
      setExchangeRates(rates || []);
      setMonitoringData(monitoring);
    } catch (err: any) {
      const message = formatApiError(err, 'Failed to load procurement reports');
      setLoadError(message);
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPipelineFilters = () => {
    loadReports(buildPipelineParams());
  };

  const handleClearPipelineFilters = () => {
    setFilterSearch('');
    setFilterBusinessUnit('');
    setFilterSupplier('');
    setFilterDestination('');
    setFilterStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    loadReports({});
  };

  const handleExportPipelineCsv = async () => {
    setExportingCsv(true);
    try {
      await api.exportShipmentPipelineCsv(buildPipelineParams());
      showToast('success', 'Import Pipeline CSV downloaded');
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to export pipeline CSV'));
    } finally {
      setExportingCsv(false);
    }
  };

  const refreshExchangeRates = async () => {
    const rates = await api.getExchangeRates();
    setExchangeRates(rates || []);
  };

  const handleUpdateExchangeRate = async () => {
    if (!canManageExchangeRates || !editingRate) return;
    setUpdatingRate(true);
    try {
      await api.updateExchangeRate(editingRate.currency, editingRate.rate);
      showToast('success', `Updated baseline exchange rate for ${editingRate.currency} to ${editingRate.rate} ETB`);
      setEditingRate(null);
      await refreshExchangeRates();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update rate'));
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleAddCurrency = async () => {
    if (!canManageExchangeRates) return;
    const code = newCurrencyCode.trim().toUpperCase();
    if (!/^[A-Z]{3,10}$/.test(code)) {
      showToast('error', 'Currency code must be 3 to 10 uppercase letters, e.g. GBP or AED');
      return;
    }
    if (exchangeRates.some((rate) => rate.currency === code)) {
      showToast('error', `${code} already exists. Use Update Default Rate instead.`);
      return;
    }
    if (Number(newCurrencyRate) <= 0) {
      showToast('error', 'Exchange rate must be greater than zero');
      return;
    }
    setUpdatingRate(true);
    try {
      await api.updateExchangeRate(code, Number(newCurrencyRate));
      showToast('success', `Added ${code} at ${Number(newCurrencyRate).toFixed(4)} ETB`);
      setNewCurrencyCode('');
      setNewCurrencyRate(0);
      await refreshExchangeRates();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to add currency'));
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
          onClick={() => loadReports()}
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
          onClick={() => setActiveTab('monitoring')}
          className={`filter-pill ${activeTab === 'monitoring' ? 'active' : ''}`}
        >
          <Activity size={15} color={activeTab === 'monitoring' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Import Monitoring Dashboard</span>
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

        <button
          onClick={() => setActiveTab('commitments')}
          className={`filter-pill ${activeTab === 'commitments' ? 'active' : ''}`}
        >
          <TrendingUp size={15} color={activeTab === 'commitments' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Financial Commitments & Letters of Credit</span>
        </button>

        <button
          onClick={() => setActiveTab('reconciliation_reports')}
          className={`filter-pill ${activeTab === 'reconciliation_reports' ? 'active' : ''}`}
        >
          <Layers size={15} color={activeTab === 'reconciliation_reports' ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
          <span>Import Reconciliation & Logistics</span>
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

          {/* Pipeline Filter Toolbar & CSV Export (IMP-43) */}
          <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Search (Shipment / PO / B/L)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="input w-full"
                    style={{ paddingLeft: '30px', fontSize: '0.8rem' }}
                    placeholder="SHP-, PO-, supplier..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Business Unit</label>
                <select className="input w-full" style={{ fontSize: '0.8rem' }} value={filterBusinessUnit} onChange={(e) => setFilterBusinessUnit(e.target.value)}>
                  <option value="">All Business Units</option>
                  {(pipelineData?.filterOptions?.businessUnits || []).map((bu: string) => (
                    <option key={bu} value={bu}>{bu}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Supplier</label>
                <select className="input w-full" style={{ fontSize: '0.8rem' }} value={filterSupplier} onChange={(e) => setFilterSupplier(e.target.value)}>
                  <option value="">All Suppliers</option>
                  {(pipelineData?.filterOptions?.suppliers || []).map((sup: string) => (
                    <option key={sup} value={sup}>{sup}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Destination</label>
                <select className="input w-full" style={{ fontSize: '0.8rem' }} value={filterDestination} onChange={(e) => setFilterDestination(e.target.value)}>
                  <option value="">All Destinations</option>
                  {(pipelineData?.filterOptions?.destinations || []).map((d: string) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Stage / Status</label>
                <select className="input w-full" style={{ fontSize: '0.8rem' }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Stages</option>
                  {Object.keys(stageLabels).map((st) => (
                    <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>From Date</label>
                <input type="date" className="input w-full" style={{ fontSize: '0.8rem' }} value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>To Date</label>
                <input type="date" className="input w-full" style={{ fontSize: '0.8rem' }} value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={handleApplyPipelineFilters} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}>
                  Apply Filters
                </button>
                <button type="button" onClick={handleClearPipelineFilters} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}>
                  Reset
                </button>
                {canExportReports && (
                  <button
                    type="button"
                    onClick={handleExportPipelineCsv}
                    disabled={exportingCsv}
                    className="btn btn-outline-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download size={14} />
                    <span>{exportingCsv ? 'Exporting...' : 'Export CSV'}</span>
                  </button>
                )}
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
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                Pipeline Shipments Tracking ({(pipelineData?.shipments || pipelineData?.recentShipments || []).length})
              </h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>SHIPMENT #</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>SUPPLIER / PO</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>BUSINESS UNIT / DEST</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>CURRENT FREIGHT STAGE</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em' }}>EXPECTED ARRIVAL</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>PO LINE BATCHES</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.05em', textAlign: 'center' }}>COST VOUCHERS</th>
                  </tr>
                </thead>
                <tbody>
                  {(pipelineData?.shipments || pipelineData?.recentShipments)?.length > 0 ? (
                    (pipelineData.shipments || pipelineData.recentShipments).map((s: any) => (
                      <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {s.shipmentNumber}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{s.supplierName || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.poNumber || '—'}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.businessUnit || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.destination || '—'}</div>
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
                      <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No shipments found matching the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: IMPORT MONITORING DASHBOARD (IMP-48) */}
      {activeTab === 'monitoring' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Shipments</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.25rem' }}>
                {monitoringData?.activeShipmentsCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {monitoringData?.totalShipmentsCount ?? 0} total shipments</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-rose)' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-rose)', textTransform: 'uppercase' }}>Missing Required Docs</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                {monitoringData?.missingDocumentsCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Required docs not yet uploaded</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-amber)' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Expired Documents</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                {monitoringData?.expiredDocumentsCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Past document expiry date</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', borderLeft: '3px solid var(--accent-indigo)' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent-indigo)', textTransform: 'uppercase' }}>Total Actionable Docs</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.25rem' }}>
                {monitoringData?.unverifiedDocumentsCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Pending: {monitoringData?.pendingDocumentsCount ?? 0} | Rejected: {monitoringData?.rejectedDocumentsCount ?? 0}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Containers</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
                {monitoringData?.activeContainersCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Forwarders: {monitoringData?.freightForwardersCount ?? 0}</div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Delays & Overdue Milestones</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.25rem' }}>
                {(monitoringData?.delayedShipmentsCount ?? 0)} / {(monitoringData?.overdueMilestonesCount ?? 0)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delayed shipments / Overdue milestones</div>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Upcoming Payments</span>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
                {monitoringData?.upcomingPaymentsCount ?? 0}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Within 7-day payment alert window</div>
            </div>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recent Shipments Operational Watchlist</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.72rem' }}>SHIPMENT #</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.72rem' }}>STAGE</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.72rem' }}>FORWARDER</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.72rem' }}>MILESTONES</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'center', fontSize: '0.72rem' }}>DOCS VERIFIED</th>
                    <th style={{ padding: '0.8rem 1rem', textAlign: 'left', fontSize: '0.72rem' }}>OUTSTANDING ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(monitoringData?.recentShipments || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No shipment monitoring records available.</td>
                    </tr>
                  ) : (
                    (monitoringData?.recentShipments || []).map((s: any) => (
                      <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.8rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{s.shipmentNumber}</td>
                        <td style={{ padding: '0.8rem 1rem' }}><span className="badge badge-subtle">{s.currentStage?.replace(/_/g, ' ')}</span></td>
                        <td style={{ padding: '0.8rem 1rem' }}>{s.forwarderName || 'Unassigned'}</td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>{s.milestonesProgress}</td>
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>{s.documentsVerified}</td>
                        <td style={{ padding: '0.8rem 1rem' }}>
                          {(s.outstandingActions || []).length === 0 ? (
                            <span className="badge badge-emerald">On Track</span>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {(s.outstandingActions || []).map((act: string) => (
                                <span key={act} className="badge badge-amber" style={{ fontSize: '0.7rem' }}>{act.replace(/_/g, ' ')}</span>
                              ))}
                            </div>
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
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Multi-Currency Baseline Exchange Rates (ETB Conversion)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Add a currency here and it becomes available in purchase orders, shipment costs, and landed-cost conversion dropdowns.
                </p>
              </div>
              {canManageExchangeRates && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="input"
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value.toUpperCase())}
                    placeholder="Code e.g. GBP"
                    maxLength={10}
                    style={{ width: '130px' }}
                  />
                  <input
                    className="input"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={newCurrencyRate || ''}
                    onChange={(e) => setNewCurrencyRate(parseFloat(e.target.value) || 0)}
                    placeholder="Rate to ETB"
                    style={{ width: '140px' }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAddCurrency}
                    disabled={updatingRate}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Add Currency
                  </button>
                </div>
              )}
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
                  ) : canManageExchangeRates && rate.currency !== 'ETB' ? (
                    <button
                      onClick={() => setEditingRate({ currency: rate.currency, rate: Number(rate.rateToEtb) })}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem', width: '100%', marginTop: '0.25rem' }}
                    >
                      Update Default Rate
                    </button>
                  ) : rate.currency === 'ETB' ? (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center', padding: '0.45rem' }}>
                      Base currency locked at 1.0000
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL COMMITMENTS & L/C (IMP-22) */}
      {activeTab === 'commitments' && <FinancialCommitmentsReport />}

      {/* TAB 5: IMPORT LOGISTICS & RECONCILIATION REPORTS (IMP-45 to IMP-48) */}
      {activeTab === 'reconciliation_reports' && <ImportReconciliationReports />}
    </div>
  );
};

