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

  // Stock Aging State
  const [agingData, setAgingData] = useState<StockAgingReport | null>(null);
  const [agingLoading, setAgingLoading] = useState(false);
  const [agingSearch, setAgingSearch] = useState('');
  const [agingBucketFilter, setAgingBucketFilter] = useState<string>('ALL');
  const [agingTypeFilter, setAgingTypeFilter] = useState<'ALL' | 'VEHICLE' | 'SPARE_PART'>('ALL');

  const fetchCreditSales = async () => {
    setCreditLoading(true);
    try {
      const data = await api.getCreditSalesReport();
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
  }, [activeReportTab]);

  // Filtered Credit Sales
  const filteredCreditSales = (creditSalesData?.records || []).filter((r) => {
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
  const filteredAging = (agingData?.records || []).filter((r) => {
    const matchesSearch =
      r.identifier.toLowerCase().includes(agingSearch.toLowerCase()) ||
      r.name.toLowerCase().includes(agingSearch.toLowerCase()) ||
      (r.warehouseName && r.warehouseName.toLowerCase().includes(agingSearch.toLowerCase()));
    const matchesBucket = agingBucketFilter === 'ALL' || r.ageBucket === agingBucketFilter;
    const matchesType = agingTypeFilter === 'ALL' || r.type === agingTypeFilter;
    return matchesSearch && matchesBucket && matchesType;
  });

  const exportCreditCsv = () => {
    if (!creditSalesData?.records) return;
    const headers = ['Type', 'Reference No', 'Customer Name', 'Customer Code', 'Sale Date', 'Due Date', 'Currency', 'Total Amount', 'Amount Paid', 'Outstanding Balance', 'Status'];
    const rows = filteredCreditSales.map((r) => [
      r.type,
      r.referenceNumber,
      `"${r.customerName}"`,
      r.customerCode || '',
      r.saleDate,
      r.dueDate || '',
      r.currency,
      r.totalAmount,
      r.amountPaid,
      r.outstandingBalance,
      r.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Credit_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAgingCsv = () => {
    if (!agingData?.records) return;
    const headers = ['Type', 'VIN / SKU Identifier', 'Product Name', 'Warehouse', 'Stock Entry Date', 'Age (Days)', 'Age Bucket', 'Quantity', 'Unit Value / Price'];
    const rows = filteredAging.map((r) => [
      r.type,
      r.identifier,
      `"${r.name}"`,
      `"${r.warehouseName || ''}"`,
      r.entryDate,
      r.ageDays,
      r.ageBucket,
      r.quantity,
      r.unitCostOrPrice,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Aging_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveReportTab('credit_sales')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeReportTab === 'credit_sales'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Credit Sales Report (KMSI-14-07)
          </button>
          <button
            onClick={() => setActiveReportTab('stock_aging')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
              activeReportTab === 'stock_aging'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Stock Aging Tracking (KMSI-14-08)
          </button>
        </div>
        <button
          onClick={activeReportTab === 'credit_sales' ? fetchCreditSales : fetchStockAging}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition"
          title="Refresh Data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${creditLoading || agingLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: CREDIT SALES REPORT (KMSI-14-07) */}
      {/* ========================================================================= */}
      {activeReportTab === 'credit_sales' && (
        <div className="space-y-5">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-slate-400 font-medium">Total Credit Sales</div>
              <div className="text-xl font-bold text-white mt-1">
                ETB {Number(creditSalesData?.totals.totalCreditSales || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Total revenue committed on credit</div>
            </div>

            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-emerald-400 font-medium">Total Collected</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                ETB {Number(creditSalesData?.totals.totalCollected || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Payments collected & posted</div>
            </div>

            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-indigo-400 font-medium">Outstanding Receivables</div>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                ETB {Number(creditSalesData?.totals.totalOutstanding || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Active customer balance due</div>
            </div>

            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
              <div className="text-xs text-rose-400 font-medium">Overdue Balances</div>
              <div className="text-xl font-bold text-rose-400 mt-1">
                ETB {Number(creditSalesData?.totals.totalOverdue || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Past contracted maturity date</div>
            </div>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/40">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, reference..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={creditSearch}
                  onChange={(e) => setCreditSearch(e.target.value)}
                />
              </div>

              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                value={creditTypeFilter}
                onChange={(e) => setCreditTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="VEHICLE">Vehicles Only</option>
                <option value="SPARE_PART">Spare Parts Only</option>
              </select>

              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
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
              onClick={exportCreditCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 uppercase tracking-wider text-[11px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Reference / Invoice</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Sale Date</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-right">Amount Paid</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {creditLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        Loading credit sales...
                      </td>
                    </tr>
                  ) : filteredCreditSales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No credit sales recorded matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCreditSales.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.type === 'VEHICLE'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium text-slate-200">{r.referenceNumber}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{r.customerName}</div>
                          {r.customerCode && <div className="text-[10px] text-slate-500 font-mono">{r.customerCode}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{r.saleDate}</td>
                        <td className="px-4 py-3">
                          {r.dueDate ? (
                            <span className={r.status === 'OVERDUE' ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                              {r.dueDate}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">
                          ETB {Number(r.totalAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-400">
                          ETB {Number(r.amountPaid).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-400">
                          ETB {Number(r.outstandingBalance).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.status === 'FULLY_SETTLED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : r.status === 'OVERDUE'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
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
      {/* SECTION 2: STOCK AGING TRACKING REPORT (KMSI-14-08) */}
      {/* ========================================================================= */}
      {activeReportTab === 'stock_aging' && (
        <div className="space-y-5">
          {/* Bucket Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { key: '0-30', label: '0 – 30 Days', color: 'emerald' },
              { key: '31-60', label: '31 – 60 Days', color: 'cyan' },
              { key: '61-90', label: '61 – 90 Days', color: 'indigo' },
              { key: '91-180', label: '91 – 180 Days', color: 'amber' },
              { key: '>180', label: 'Over 180 Days', color: 'rose' },
            ].map((b) => {
              const summary = agingData?.bucketSummary?.[b.key] || { count: 0, value: 0 };
              return (
                <div
                  key={b.key}
                  onClick={() => setAgingBucketFilter(agingBucketFilter === b.key ? 'ALL' : b.key)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    agingBucketFilter === b.key
                      ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                      : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-slate-400">{b.label}</div>
                  <div className="text-lg font-bold text-white mt-1">{summary.count} units</div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    ETB {Number(summary.value || 0).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters & Export */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/40">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search VIN/Chassis, SKU, item..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  value={agingSearch}
                  onChange={(e) => setAgingSearch(e.target.value)}
                />
              </div>

              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
                value={agingTypeFilter}
                onChange={(e) => setAgingTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Categories</option>
                <option value="VEHICLE">Vehicles (Chassis / VIN)</option>
                <option value="SPARE_PART">Spare Parts</option>
              </select>

              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
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
              onClick={exportAgingCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1.5 transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/60 uppercase tracking-wider text-[11px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Unique VIN / Part SKU</th>
                    <th className="px-4 py-3">Item Description</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3">Stock Entry Date</th>
                    <th className="px-4 py-3 text-center">Days in Stock</th>
                    <th className="px-4 py-3 text-center">Aging Bucket</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Unit Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {agingLoading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        Calculating stock aging...
                      </td>
                    </tr>
                  ) : filteredAging.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No inventory matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAging.map((r, i) => (
                      <tr key={`${r.identifier}-${i}`} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.type === 'VEHICLE'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-200">{r.identifier}</td>
                        <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                        <td className="px-4 py-3 text-slate-400">{r.warehouseName || 'Main Hub'}</td>
                        <td className="px-4 py-3 text-slate-400">{r.entryDate}</td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-white">{r.ageDays}d</td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              r.ageBucket === '0-30'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : r.ageBucket === '31-60'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : r.ageBucket === '61-90'
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : r.ageBucket === '91-180'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold'
                            }`}
                          >
                            {r.ageBucket} days
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium">{r.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-300">
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
