import React, { useState, useEffect } from 'react';
import { api, CreditSalesReport, StockAgingReport, CreditSaleItem, StockAgingItem } from '../api/client';
import {
  CreditCard,
  Clock,
  Download,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  Layers,
  Calendar,
  DollarSign,
  Package,
} from 'lucide-react';

export const CreditSalesAndAgingReports: React.FC = () => {
  const [activeReportTab, setActiveReportTab] = useState<'credit_sales' | 'stock_aging'>('credit_sales');
  
  // Credit Sales State
  const [creditSalesData, setCreditSalesData] = useState<CreditSalesReport | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditSearch, setCreditSearch] = useState('');
  const [creditTypeFilter, setCreditTypeFilter] = useState<'ALL' | 'VEHICLE' | 'SPARE_PART'>('ALL');
  const [creditStatusFilter, setCreditStatusFilter] = useState<'ALL' | 'OVERDUE' | 'PENDING' | 'SETTLED'>('ALL');
  const [creditStartDate, setCreditStartDate] = useState('');
  const [creditEndDate, setCreditEndDate] = useState('');
  const [creditBranch, setCreditBranch] = useState('ALL');

  // Stock Aging State
  const [agingData, setAgingData] = useState<StockAgingReport | null>(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingSearch, setAgingSearch] = useState('');
  const [agingBucketFilter, setAgingBucketFilter] = useState<string>('ALL');
  const [agingTypeFilter, setAgingTypeFilter] = useState<'ALL' | 'VEHICLE' | 'SPARE_PART'>('ALL');

  const fetchCreditSales = async () => {
    setCreditLoading(true);
    try {
      const data = await api.getCreditSalesReport({
        startDate: creditStartDate || undefined,
        endDate: creditEndDate || undefined,
        branch: creditBranch !== 'ALL' ? creditBranch : undefined,
      });
      setCreditSalesData(data);
    } catch (err) {
      console.error('Failed to fetch credit sales report:', err);
    } finally {
      setCreditLoading(false);
    }
  };

  const fetchStockAging = async () => {
    setAgingLoading(true);
    try {
      const data = await api.getStockAgingReport();
      setAgingData(data);
    } catch (err) {
      console.error('Failed to fetch stock aging report:', err);
    } finally {
      setAgingLoading(false);
    }
  };

  useEffect(() => {
    if (activeReportTab === 'credit_sales') {
      fetchCreditSales();
    } else {
      fetchStockAging();
    }
  }, [activeReportTab, creditStartDate, creditEndDate, creditBranch]);

  // Normalized records
  const normalizedCreditRecords = (creditSalesData?.records || (creditSalesData as any)?.items || []).map((r: any) => ({
    id: r.id || r.reference_number || r.referenceNumber,
    type: (r.type || (r.sale_type === 'SPARE_PARTS' ? 'SPARE_PART' : 'VEHICLE')) as 'VEHICLE' | 'SPARE_PART',
    referenceNumber: r.referenceNumber || r.reference_number || 'REF-N/A',
    customerName: r.customerName || r.customer_name || 'Customer',
    customerCode: r.customerCode || r.customer_code,
    branch: r.branch || 'Addis Ababa Main',
    saleDate: r.saleDate || r.sale_date || '',
    dueDate: r.dueDate || r.due_date,
    currency: r.currency || 'ETB',
    totalAmount: Number(r.totalAmount || r.total_amount || 0),
    amountPaid: Number(r.amountPaid || r.amount_paid || 0),
    outstandingBalance: Number(r.outstandingBalance || r.outstanding_balance || 0),
    status: r.status || (r.payment_status === 'PAID' ? 'FULLY_SETTLED' : r.payment_status === 'OVERDUE' ? 'OVERDUE' : 'PENDING_PAYMENT'),
  }));

  const normalizedAgingRecords = (agingData?.records || (agingData as any)?.items || []).map((r: any) => ({
    type: (r.type || r.item_type || 'VEHICLE') as 'VEHICLE' | 'SPARE_PART',
    categoryName: r.categoryName || r.category_name || (r.type === 'SPARE_PART' || r.item_type === 'SPARE_PART' ? 'Spare Parts' : 'Imported Vehicles'),
    identifier: r.identifier || r.chassis_number || '',
    name: r.name || r.item_name || 'Standard Model',
    warehouseName: r.warehouseName || r.warehouse_name || 'Main Warehouse',
    entryDate: r.entryDate || r.stock_entry_date || '',
    ageDays: Number(r.ageDays || r.age_in_days || 0),
    ageBucket: r.ageBucket || (r.aging_bucket ? r.aging_bucket.replace('_TO_', '-').replace('_DAYS', '').replace('OVER_180', '>180') : '0-30'),
    quantity: Number(r.quantity || 1),
    unitCostOrPrice: Number(r.unitCostOrPrice || r.unit_value || 0),
  }));

  const creditSummary = (creditSalesData as any)?.summary || (creditSalesData as any)?.totals || {};
  const totalCreditSales = Number(creditSummary.totalCreditSales ?? normalizedCreditRecords.reduce((s: number, r: any) => s + r.totalAmount, 0));
  const totalCollected = Number(creditSummary.totalCollected ?? normalizedCreditRecords.reduce((s: number, r: any) => s + r.amountPaid, 0));
  const totalOutstanding = Number(creditSummary.totalOutstanding ?? normalizedCreditRecords.reduce((s: number, r: any) => s + r.outstandingBalance, 0));
  const totalOverdue = Number(creditSummary.overdueAmount ?? creditSummary.totalOverdue ?? normalizedCreditRecords.filter((r: any) => r.status === 'OVERDUE').reduce((s: number, r: any) => s + r.outstandingBalance, 0));

  const getBucketSummary = (bucketKey: string) => {
    const matching = normalizedAgingRecords.filter((r: any) => r.ageBucket === bucketKey);
    const count = matching.length;
    const value = matching.reduce((sum: number, r: any) => sum + (r.unitCostOrPrice * r.quantity), 0);
    return { count, value };
  };

  // Filtered Credit Sales
  const filteredCreditSales = normalizedCreditRecords.filter((r: any) => {
    const matchesSearch =
      r.customerName.toLowerCase().includes(creditSearch.toLowerCase()) ||
      r.referenceNumber.toLowerCase().includes(creditSearch.toLowerCase()) ||
      (r.customerCode && r.customerCode.toLowerCase().includes(creditSearch.toLowerCase()));
    const matchesType = creditTypeFilter === 'ALL' || r.type === creditTypeFilter;
    const matchesStatus =
      creditStatusFilter === 'ALL' ||
      (creditStatusFilter === 'OVERDUE' && r.status === 'OVERDUE') ||
      (creditStatusFilter === 'PENDING' && r.status === 'PENDING_PAYMENT') ||
      (creditStatusFilter === 'SETTLED' && r.status === 'FULLY_SETTLED');
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered Stock Aging
  const filteredAging = normalizedAgingRecords.filter((r: any) => {
    const matchesSearch =
      r.identifier.toLowerCase().includes(agingSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(agingSearch.toLowerCase()) ||
      (r.categoryName && r.categoryName.toLowerCase().includes(agingSearch.toLowerCase())) ||
      (r.warehouseName && r.warehouseName.toLowerCase().includes(agingSearch.toLowerCase()));
    const matchesBucket = agingBucketFilter === 'ALL' || r.ageBucket === agingBucketFilter;
    const matchesType = agingTypeFilter === 'ALL' || r.type === agingTypeFilter;
    return matchesSearch && matchesBucket && matchesType;
  });

  const exportCreditCsv = () => {
    if (!normalizedCreditRecords.length) return;
    const headers = ['Type', 'Reference No', 'Customer Name', 'Customer Code', 'Branch', 'Sale Date', 'Due Date', 'Currency', 'Total Amount', 'Amount Paid', 'Outstanding Balance', 'Status'];
    const rows = filteredCreditSales.map((r: any) => [
      r.type,
      r.referenceNumber,
      `"${r.customerName}"`,
      r.customerCode || '',
      `"${r.branch}"`,
      r.saleDate,
      r.dueDate || '',
      r.currency,
      r.totalAmount,
      r.amountPaid,
      r.outstandingBalance,
      r.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Credit_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAgingCsv = () => {
    if (!normalizedAgingRecords.length) return;
    const headers = ['Type', 'Category', 'VIN / SKU Identifier', 'Product Name', 'Warehouse', 'Stock Entry Date', 'Age (Days)', 'Age Bucket', 'Quantity', 'Unit Value / Price'];
    const rows = filteredAging.map((r: any) => [
      r.type,
      `"${r.categoryName}"`,
      r.identifier,
      `"${r.name}"`,
      `"${r.warehouseName || ''}"`,
      r.entryDate,
      r.ageDays,
      r.ageBucket,
      r.quantity,
      r.unitCostOrPrice,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Aging_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
      {/* Sub Navigation Tabs & Refresh */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.85rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveReportTab('credit_sales')}
            className={`filter-pill ${activeReportTab === 'credit_sales' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <CreditCard size={16} />
            <span>Credit Sales Report</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveReportTab('stock_aging')}
            className={`filter-pill ${activeReportTab === 'stock_aging' ? 'active' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700 }}
          >
            <Clock size={16} />
            <span>Stock Aging Report</span>
          </button>
        </div>

        <button
          type="button"
          onClick={activeReportTab === 'credit_sales' ? fetchCreditSales : fetchStockAging}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
          title="Refresh Data"
        >
          <RefreshCw size={14} className={creditLoading || agingLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CREDIT SALES REPORT */}
      {/* ========================================================================= */}
      {activeReportTab === 'credit_sales' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Credit Sales</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <CreditCard size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                ETB {totalCreditSales.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total revenue committed on credit</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collected</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <CheckCircle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                ETB {totalCollected.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Payments collected & posted</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#0284c7' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outstanding Receivables</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <Clock size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0284c7', fontFamily: 'monospace' }}>
                ETB {totalOutstanding.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Active customer balance due</div>
            </div>

            <div className="card" style={{ padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: totalOverdue > 0 ? '#ef4444' : '#64748b' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue Balances</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: totalOverdue > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(100, 116, 139, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: totalOverdue > 0 ? '#ef4444' : '#64748b' }}>
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: totalOverdue > 0 ? '#ef4444' : 'var(--text-primary)', fontFamily: 'monospace' }}>
                ETB {totalOverdue.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Past contracted maturity date</div>
            </div>
          </div>

          {/* Filters & Export */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search customer, reference..."
                  className="input"
                  style={{ width: '100%', paddingLeft: '2.25rem', height: '38px', fontSize: '0.82rem' }}
                  value={creditSearch}
                  onChange={(e) => setCreditSearch(e.target.value)}
                />
              </div>

              <select
                className="input"
                style={{ height: '38px', fontSize: '0.82rem', minWidth: '130px' }}
                value={creditTypeFilter}
                onChange={(e) => setCreditTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="VEHICLE">Vehicles Only</option>
                <option value="SPARE_PART">Spare Parts Only</option>
              </select>

              <select
                className="input"
                style={{ height: '38px', fontSize: '0.82rem', minWidth: '150px' }}
                value={creditBranch}
                onChange={(e) => setCreditBranch(e.target.value)}
              >
                <option value="ALL">All Branches</option>
                <option value="Addis Ababa Main">Addis Ababa Main</option>
                <option value="Kality Assembly Plant">Kality Assembly Plant</option>
                <option value="Bole Showroom">Bole Showroom</option>
                <option value="Hawassa Branch">Hawassa Branch</option>
              </select>

              <select
                className="input"
                style={{ height: '38px', fontSize: '0.82rem', minWidth: '130px' }}
                value={creditStatusFilter}
                onChange={(e) => setCreditStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Statuses</option>
                <option value="OVERDUE">Overdue Only</option>
                <option value="PENDING">Pending Balance</option>
                <option value="SETTLED">Fully Settled</option>
              </select>
            </div>

            <button
              type="button"
              onClick={exportCreditCsv}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference / Invoice</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Branch</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sale Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Total Amount</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Amount Paid</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Outstanding</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {creditLoading ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Loading credit sales report...
                      </td>
                    </tr>
                  ) : filteredCreditSales.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No credit sales recorded matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCreditSales.map((r: any) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: r.type === 'VEHICLE' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                              color: r.type === 'VEHICLE' ? '#6366f1' : '#0284c7',
                              border: `1px solid ${r.type === 'VEHICLE' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(2, 132, 199, 0.3)'}`,
                            }}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.referenceNumber}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.customerName}</div>
                          {r.customerCode && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{r.customerCode}</div>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{r.branch}</td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {r.saleDate ? new Date(r.saleDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: r.status === 'OVERDUE' ? '#ef4444' : 'var(--text-secondary)', fontWeight: r.status === 'OVERDUE' ? 700 : 500 }}>
                          {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          ETB {Number(r.totalAmount).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>
                          ETB {Number(r.amountPaid).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', color: Number(r.outstandingBalance) > 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: 700 }}>
                          ETB {Number(r.outstandingBalance).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                r.status === 'FULLY_SETTLED'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : r.status === 'OVERDUE'
                                  ? 'rgba(239, 68, 68, 0.12)'
                                  : 'rgba(245, 158, 11, 0.12)',
                              color:
                                r.status === 'FULLY_SETTLED'
                                  ? '#10b981'
                                  : r.status === 'OVERDUE'
                                  ? '#ef4444'
                                  : '#f59e0b',
                              border: `1px solid ${
                                r.status === 'FULLY_SETTLED'
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : r.status === 'OVERDUE'
                                  ? 'rgba(239, 68, 68, 0.25)'
                                  : 'rgba(245, 158, 11, 0.25)'
                              }`,
                            }}
                          >
                            {r.status.replace(/_/g, ' ')}
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

      {/* ========================================================================= */}
      {/* SECTION 2: STOCK AGING REPORT */}
      {/* ========================================================================= */}
      {activeReportTab === 'stock_aging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Bucket Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
            {[
              { key: '0-30', label: '0 – 30 Days', color: '#10b981' },
              { key: '31-60', label: '31 – 60 Days', color: '#00D2D3' },
              { key: '61-90', label: '61 – 90 Days', color: '#6366f1' },
              { key: '91-180', label: '91 – 180 Days', color: '#f59e0b' },
              { key: '>180', label: 'Over 180 Days', color: '#ef4444' },
            ].map((b) => {
              const summary = agingData?.bucketSummary?.[b.key] || getBucketSummary(b.key);
              const isSelected = agingBucketFilter === b.key;
              return (
                <div
                  key={b.key}
                  onClick={() => setAgingBucketFilter(isSelected ? 'ALL' : b.key)}
                  className="card"
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    border: isSelected ? `2px solid ${b.color}` : '1px solid var(--border-color)',
                    background: isSelected ? 'rgba(0, 210, 211, 0.08)' : 'var(--bg-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: b.color }} />
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {b.label}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                    {summary.count} units
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                    ETB {Number(summary.value || 0).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters & Export */}
          <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', flex: 1 }}>
              <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px' }}>
                <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search VIN/Chassis, SKU, item..."
                  className="input"
                  style={{ width: '100%', paddingLeft: '2.25rem', height: '38px', fontSize: '0.82rem' }}
                  value={agingSearch}
                  onChange={(e) => setAgingSearch(e.target.value)}
                />
              </div>

              <select
                className="input"
                style={{ height: '38px', fontSize: '0.82rem', minWidth: '150px' }}
                value={agingTypeFilter}
                onChange={(e) => setAgingTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Categories</option>
                <option value="VEHICLE">Vehicles (Chassis / VIN)</option>
                <option value="SPARE_PART">Spare Parts</option>
              </select>

              <select
                className="input"
                style={{ height: '38px', fontSize: '0.82rem', minWidth: '150px' }}
                value={agingBucketFilter}
                onChange={(e) => setAgingBucketFilter(e.target.value)}
              >
                <option value="ALL">All Aging Buckets</option>
                <option value="0-30">0 – 30 Days</option>
                <option value="31-60">31 – 60 Days</option>
                <option value="61-90">61 – 90 Days</option>
                <option value="91-180">91 – 180 Days</option>
                <option value=">180">&gt; 180 Days (Critical)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={exportAgingCsv}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 0.95rem', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unique VIN / Part SKU</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item Description</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warehouse</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Entry Date</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Days in Stock</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Aging Bucket</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Quantity</th>
                    <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Unit Value</th>
                  </tr>
                </thead>
                <tbody>
                  {agingLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Calculating stock aging...
                      </td>
                    </tr>
                  ) : filteredAging.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No inventory matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAging.map((r: any, i: number) => (
                      <tr key={`${r.identifier}-${i}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.categoryName}</div>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              marginTop: '0.2rem',
                              background: r.type === 'VEHICLE' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(2, 132, 199, 0.12)',
                              color: r.type === 'VEHICLE' ? '#6366f1' : '#0284c7',
                              border: `1px solid ${r.type === 'VEHICLE' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(2, 132, 199, 0.25)'}`,
                            }}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.identifier}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {r.name}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {r.warehouseName || 'Main Hub'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {r.entryDate ? new Date(r.entryDate).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.ageDays}d
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.25rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                r.ageBucket === '0-30'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : r.ageBucket === '31-60'
                                  ? 'rgba(0, 210, 211, 0.12)'
                                  : r.ageBucket === '61-90'
                                  ? 'rgba(99, 102, 241, 0.12)'
                                  : r.ageBucket === '91-180'
                                  ? 'rgba(245, 158, 11, 0.12)'
                                  : 'rgba(239, 68, 68, 0.12)',
                              color:
                                r.ageBucket === '0-30'
                                  ? '#10b981'
                                  : r.ageBucket === '31-60'
                                  ? '#00D2D3'
                                  : r.ageBucket === '61-90'
                                  ? '#6366f1'
                                  : r.ageBucket === '91-180'
                                  ? '#f59e0b'
                                  : '#ef4444',
                              border: `1px solid ${
                                r.ageBucket === '0-30'
                                  ? 'rgba(16, 185, 129, 0.25)'
                                  : r.ageBucket === '31-60'
                                  ? 'rgba(0, 210, 211, 0.25)'
                                  : r.ageBucket === '61-90'
                                  ? 'rgba(99, 102, 241, 0.25)'
                                  : r.ageBucket === '91-180'
                                  ? 'rgba(245, 158, 11, 0.25)'
                                  : 'rgba(239, 68, 68, 0.25)'
                              }`,
                            }}
                          >
                            {r.ageBucket} days
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                          {r.quantity}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                          ETB {Number(r.unitCostOrPrice).toLocaleString()}
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

