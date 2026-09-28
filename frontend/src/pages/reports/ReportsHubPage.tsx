import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Receipt,
  Truck,
  CarFront,
  DollarSign,
  Download,
  Filter,
  RefreshCw,
  Search,
  Calendar,
  Layers,
  Building,
  UserCheck,
  FileSpreadsheet,
} from 'lucide-react';
import {
  api,
  DailySalesItem,
  MonthlySalesItem,
  SalesByCategoryItem,
  SalesByModelItem,
  SalesByCustomerItem,
  SalesByRegionItem,
  SalesByCustomerTypeItem,
  SalesBySalespersonItem,
  InvoiceReportItem,
  DeliveryReportItem,
  CustomerFinancialSummaryItem,
  CurrentStockReportItem,
  VehicleStatusReportItem,
} from '../../api/client';

export const ReportsHubPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'operational' | 'inventory' | 'financial'>('sales');
  const [salesSubTab, setSalesSubTab] = useState<'daily' | 'monthly' | 'model' | 'category' | 'customer' | 'region' | 'salesperson'>('daily');
  const [operationalSubTab, setOperationalSubTab] = useState<'invoices' | 'deliveries' | 'enquiries' | 'bookings'>('invoices');

  const [loading, setLoading] = useState<boolean>(true);

  // Data states
  const [dailySales, setDailySales] = useState<DailySalesItem[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySalesItem[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategoryItem[]>([]);
  const [salesByModel, setSalesByModel] = useState<SalesByModelItem[]>([]);
  const [salesByCustomer, setSalesByCustomer] = useState<SalesByCustomerItem[]>([]);
  const [salesByRegion, setSalesByRegion] = useState<SalesByRegionItem[]>([]);
  const [salesByCustomerType, setSalesByCustomerType] = useState<SalesByCustomerTypeItem[]>([]);
  const [salesBySalesperson, setSalesBySalesperson] = useState<SalesBySalespersonItem[]>([]);
  const [invoicesReport, setInvoicesReport] = useState<InvoiceReportItem[]>([]);
  const [deliveriesReport, setDeliveriesReport] = useState<DeliveryReportItem[]>([]);
  const [enquiriesReport, setEnquiriesReport] = useState<any[]>([]);
  const [bookingsReport, setBookingsReport] = useState<any[]>([]);
  const [stockReport, setStockReport] = useState<CurrentStockReportItem[]>([]);
  const [vehicleStatusReport, setVehicleStatusReport] = useState<VehicleStatusReportItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<CustomerFinancialSummaryItem[]>([]);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    setLoading(true);
    try {
      const [
        daily,
        monthly,
        byCat,
        byMod,
        byCust,
        byReg,
        byCustType,
        bySp,
        invRep,
        delRep,
        enqRep,
        bkRep,
        stkRep,
        vehRep,
        finRep,
      ] = await Promise.all([
        api.getDailySalesReport({ startDate: startDate || undefined, endDate: endDate || undefined }).catch(() => []),
        api.getMonthlySalesReport().catch(() => []),
        api.getSalesByVehicleType().catch(() => []),
        api.getSalesByModel().catch(() => []),
        api.getSalesByCustomer().catch(() => []),
        api.getSalesByRegion().catch(() => []),
        api.getSalesByCustomerType().catch(() => []),
        api.getSalesBySalesperson().catch(() => []),
        api.getOperationalInvoiceReport().catch(() => []),
        api.getOperationalDeliveryReport().catch(() => []),
        api.getOperationalEnquiriesReport().catch(() => []),
        api.getOperationalBookingsReport().catch(() => []),
        api.getCurrentStockReport().catch(() => []),
        api.getVehicleInventoryByStatusReport().catch(() => []),
        api.getCustomerFinancialSummary().catch(() => []),
      ]);

      setDailySales(daily);
      setMonthlySales(monthly);
      setSalesByCategory(byCat);
      setSalesByModel(byMod);
      setSalesByCustomer(byCust);
      setSalesByRegion(byReg);
      setSalesByCustomerType(byCustType);
      setSalesBySalesperson(bySp);
      setInvoicesReport(invRep);
      setDeliveriesReport(delRep);
      setEnquiriesReport(enqRep);
      setBookingsReport(bkRep);
      setStockReport(stkRep);
      setVehicleStatusReport(vehRep);
      setFinancialSummary(finRep);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const formatETB = (val?: number | string) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ETB';
  };

  // CSV Export utility (Story F2)
  const exportToCSV = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row: any) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
              cell = cell.replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
              return cell;
            })
            .join(separator),
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Breadcrumb matching SOA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Executive Intelligence</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>BI & Analytics</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Reports & Analytics Hub</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 style={{ color: 'var(--accent-cyan)' }} size={28} />
            Reports & Analytics Hub
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Enterprise Sales, Operations, Inventory & Customer Financial Ledgers BI Engine
          </p>
        </div>
        <button
          onClick={loadAllReports}
          disabled={loading}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      {/* Main Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'sales', label: 'Sales Reports', icon: TrendingUp },
          { key: 'operational', label: 'Operational Reports', icon: Receipt },
          { key: 'inventory', label: 'Inventory & Fleet Reports', icon: CarFront },
          { key: 'financial', label: 'Customer Financial Reports', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SALES REPORTS */}
      {activeTab === 'sales' && (
        <div>
          {/* Sub-tabs for Sales */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { key: 'daily', label: 'Daily Sales' },
              { key: 'monthly', label: 'Monthly Trend' },
              { key: 'model', label: 'By Vehicle Model' },
              { key: 'category', label: 'By Category' },
              { key: 'customer', label: 'By Customer' },
              { key: 'region', label: 'By Region' },
              { key: 'salesperson', label: 'By Salesperson' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setSalesSubTab(st.key as any)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: salesSubTab === st.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: salesSubTab === st.key ? 'var(--accent-cyan)' : 'var(--bg-secondary)',
                  color: salesSubTab === st.key ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Daily Sales Table */}
          {salesSubTab === 'daily' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Daily Approved Sales</div>
                <button
                  onClick={() => exportToCSV('daily_sales_report', dailySales)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SALES DATE</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS SALES REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No approved sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      dailySales.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{d.sales_date}</td>
                          <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{d.invoice_count}</td>
                          <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{d.units_sold}</td>
                          <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                            {formatETB(d.total_sales)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly Sales Table */}
          {salesSubTab === 'monthly' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Sales Performance</div>
                <button
                  onClick={() => exportToCSV('monthly_sales_report', monthlySales)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MONTH</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySales.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{m.sales_month}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{m.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{m.units_sold}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                          {formatETB(m.total_sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Model */}
          {salesSubTab === 'model' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sales by Vehicle Model</div>
                <button
                  onClick={() => exportToCSV('sales_by_model', salesByModel)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MODEL</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PRODUCT NAME</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByModel.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{item.model || 'Standard'}</td>
                        <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{item.item_name}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{item.units_sold}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatETB(item.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Category */}
          {salesSubTab === 'category' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sales by Category</div>
                <button
                  onClick={() => exportToCSV('sales_by_category', salesByCategory)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CATEGORY</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCategory.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.category_name}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{item.units_sold}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatETB(item.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Customer */}
          {salesSubTab === 'customer' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Sales by Customer Account</div>
                <button
                  onClick={() => exportToCSV('sales_by_customer', salesByCustomer)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER CODE</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>NAME</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICES</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCustomer.map((c) => (
                      <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{c.customer_code}</td>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{c.full_name}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{c.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatETB(c.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Region */}
          {salesSubTab === 'region' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Regional Sales Performance</div>
                <button
                  onClick={() => exportToCSV('sales_by_region', salesByRegion)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REGION</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByRegion.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.region_name}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{r.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-cyan)' }}>{formatETB(r.total_sales)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sales by Salesperson */}
          {salesSubTab === 'salesperson' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Salesperson Performance</div>
                <button
                  onClick={() => exportToCSV('sales_by_salesperson', salesBySalesperson)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SALESPERSON</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICES CLOSED</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL SALES VALUE (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesBySalesperson.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No sales mapped to specific salesperson accounts yet.
                        </td>
                      </tr>
                    ) : (
                      salesBySalesperson.map((sp) => (
                        <tr key={sp.salesperson_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sp.salesperson_name}</td>
                          <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{sp.invoice_count}</td>
                          <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatETB(sp.total_sales)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPERATIONAL REPORTS */}
      {activeTab === 'operational' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {[
              { key: 'invoices', label: 'Sales Invoices Report' },
              { key: 'deliveries', label: 'Vehicle Deliveries Report' },
              { key: 'enquiries', label: 'Enquiries Pipeline' },
              { key: 'bookings', label: 'Bookings Queue' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setOperationalSubTab(st.key as any)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: operationalSubTab === st.key ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  background: operationalSubTab === st.key ? 'var(--accent-cyan)' : 'var(--bg-secondary)',
                  color: operationalSubTab === st.key ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Invoices Report Table */}
          {operationalSubTab === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Invoices Master Operational Report</div>
                <button
                  onClick={() => exportToCSV('invoices_operational_report', invoicesReport)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>INVOICE #</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PRODUCT / CHASSIS</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>GROSS TOTAL</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>OUTSTANDING</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesReport.map((inv) => (
                      <tr key={inv.invoice_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{inv.invoice_number}</td>
                        <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{inv.customer_name}</td>
                        <td style={{ padding: '0.85rem 1.15rem' }}>
                          <div style={{ color: 'var(--text-primary)' }}>{inv.item_name}</div>
                          {inv.chassis_number && (
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{inv.chassis_number}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{formatETB(inv.gross_total)}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: Number(inv.outstanding_balance) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                          {formatETB(inv.outstanding_balance)}
                        </td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'center' }}>
                          <span
                            className={inv.status === 'APPROVED' ? 'badge badge-emerald' : 'badge badge-amber'}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Deliveries Report Table */}
          {operationalSubTab === 'deliveries' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vehicle Deliveries & Handover Operational Report</div>
                <button
                  onClick={() => exportToCSV('deliveries_operational_report', deliveriesReport)}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DELIVERY #</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CHASSIS / VIN</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ENGINE NUMBER</th>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>RESPONSIBLE OFFICER</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveriesReport.map((del) => (
                      <tr key={del.delivery_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>{del.delivery_number}</td>
                        <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{del.customer_name || '—'}</td>
                        <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{del.chassis_number}</td>
                        <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{del.engine_number}</td>
                        <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{del.responsible_employee || 'Unassigned'}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'center' }}>
                          <span
                            className={del.status === 'APPROVED' ? 'badge badge-emerald' : 'badge badge-amber'}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {del.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Enquiries Pipeline Table */}
          {operationalSubTab === 'enquiries' && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Sales Enquiries Status Distribution</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ENQUIRIES COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PIPELINE VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiriesReport.map((enq, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{enq.status}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{enq.enquiry_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-cyan)' }}>{formatETB(enq.pipeline_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bookings Queue Table */}
          {operationalSubTab === 'bookings' && (
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Advance Bookings Distribution</div>
              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>BOOKING STATUS</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>COUNT</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>BOOKING FEES</th>
                      <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DEPOSITS PAID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsReport.map((bk, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{bk.status}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{bk.booking_count}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatETB(bk.total_fees)}</td>
                        <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatETB(bk.total_deposits_paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: INVENTORY REPORTS */}
      {activeTab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Current Stock Balances & Reorder Points</div>
            <button
              onClick={() => exportToCSV('inventory_stock_balance_report', stockReport)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ITEM CODE</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>PRODUCT NAME</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ON HAND</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>RESERVED</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>AVAILABLE</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REORDER POINT</th>
                </tr>
              </thead>
              <tbody>
                {stockReport.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.warehouse_name}</td>
                    <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{item.item_code}</td>
                    <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{item.item_name}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{item.quantity_on_hand}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--accent-amber)' }}>{item.quantity_reserved}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: item.quantity_available <= item.reorder_level ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {item.quantity_available}
                    </td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Fleet Lifecycle Status Distribution</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>MODEL</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>UNITS COUNT</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStatusReport.map((vr, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{vr.warehouse_name || 'All Warehouses'}</td>
                    <td style={{ padding: '0.85rem 1.15rem', color: 'var(--text-primary)' }}>{vr.model_name || 'All Models'}</td>
                    <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{vr.status}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-cyan)' }}>{vr.vehicle_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER FINANCIAL REPORTS */}
      {activeTab === 'financial' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Customer Financial Ledger & Receivables Summary</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Comprehensive cross-customer ledger reconciliation, advance deposits, credit balances and receivables
              </div>
            </div>
            <button
              onClick={() => exportToCSV('customer_financial_summary', financialSummary)}
              className="btn btn-secondary"
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER CODE</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CUSTOMER NAME</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TYPE</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL DEBITED</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TOTAL CREDITED</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>NET RECEIVABLE</th>
                </tr>
              </thead>
              <tbody>
                {financialSummary.map((f) => (
                  <tr key={f.customer_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.15rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{f.customer_code}</td>
                    <td style={{ padding: '0.85rem 1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>{f.full_name}</td>
                    <td style={{ padding: '0.85rem 1.15rem' }}>
                      <span className="badge badge-subtle">
                        {f.customer_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--text-primary)' }}>{formatETB(f.total_debited)}</td>
                    <td style={{ padding: '0.85rem 1.15rem', textAlign: 'right', color: 'var(--accent-emerald)' }}>{formatETB(f.total_credited)}</td>
                    <td
                      style={{
                        padding: '0.85rem 1.15rem',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: Number(f.net_receivable) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                      }}
                    >
                      {formatETB(f.net_receivable)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
