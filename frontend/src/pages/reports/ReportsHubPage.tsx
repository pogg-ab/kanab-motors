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
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BarChart3 className="text-cyan" size={28} />
            Reports & Analytics Hub
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            KMSICAMS-7 • Enterprise Sales, Operations, Inventory & Financial Ledgers Reporting Engine
          </p>
        </div>
        <button
          onClick={loadAllReports}
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
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh Data
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
                color: isActive ? '#00D2D3' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                borderBottom: isActive ? '2px solid #00D2D3' : '2px solid transparent',
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
                  border: '1px solid var(--border-color)',
                  background: salesSubTab === st.key ? '#00D2D3' : 'var(--bg-secondary)',
                  color: salesSubTab === st.key ? '#0D1117' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Daily Sales Table */}
          {salesSubTab === 'daily' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Daily Approved Sales (Story SR2)</div>
                <button
                  onClick={() => exportToCSV('daily_sales_report', dailySales)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>SALES DATE</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GROSS SALES REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No approved sales recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      dailySales.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{d.sales_date}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{d.invoice_count}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{d.units_sold}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#00D2D3' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Monthly Sales Performance (Story SR2)</div>
                <button
                  onClick={() => exportToCSV('monthly_sales_report', monthlySales)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>MONTH</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySales.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{m.sales_month}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{m.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{m.units_sold}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Sales by Vehicle Model (Story SR3)</div>
                <button
                  onClick={() => exportToCSV('sales_by_model', salesByModel)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>MODEL</th>
                      <th style={{ padding: '0.85rem 1rem' }}>PRODUCT NAME</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GROSS REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByModel.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#00D2D3' }}>{item.model || 'Standard'}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{item.item_name}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{item.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{item.units_sold}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800 }}>{formatETB(item.total_sales)}</td>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Sales by Category (Story SR3)</div>
                <button
                  onClick={() => exportToCSV('sales_by_category', salesByCategory)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>CATEGORY</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS SOLD</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GROSS REVENUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCategory.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{item.category_name}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{item.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{item.units_sold}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>{formatETB(item.total_sales)}</td>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Sales by Customer Account (Story SR4)</div>
                <button
                  onClick={() => exportToCSV('sales_by_customer', salesByCustomer)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>CUSTOMER CODE</th>
                      <th style={{ padding: '0.85rem 1rem' }}>NAME</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICES</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByCustomer.map((c) => (
                      <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3' }}>{c.customer_code}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{c.full_name}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{c.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800 }}>{formatETB(c.total_sales)}</td>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Regional Sales Performance (Story SR4)</div>
                <button
                  onClick={() => exportToCSV('sales_by_region', salesByRegion)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>REGION</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICE COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL SALES (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesByRegion.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{r.region_name}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{r.invoice_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#00D2D3' }}>{formatETB(r.total_sales)}</td>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Salesperson Performance (Story SR5)</div>
                <button
                  onClick={() => exportToCSV('sales_by_salesperson', salesBySalesperson)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>SALESPERSON</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>INVOICES CLOSED</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL SALES VALUE (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesBySalesperson.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No sales mapped to specific salesperson accounts yet.
                        </td>
                      </tr>
                    ) : (
                      salesBySalesperson.map((sp) => (
                        <tr key={sp.salesperson_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{sp.salesperson_name}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{sp.invoice_count}</td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>{formatETB(sp.total_sales)}</td>
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
              { key: 'invoices', label: 'Sales Invoices Report (OR1)' },
              { key: 'deliveries', label: 'Vehicle Deliveries Report (OR2)' },
              { key: 'enquiries', label: 'Enquiries Pipeline (OR4)' },
              { key: 'bookings', label: 'Bookings Queue (OR5)' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setOperationalSubTab(st.key as any)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: '1px solid var(--border-color)',
                  background: operationalSubTab === st.key ? '#00D2D3' : 'var(--bg-secondary)',
                  color: operationalSubTab === st.key ? '#0D1117' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Invoices Report Table */}
          {operationalSubTab === 'invoices' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Invoices Master Operational Report</div>
                <button
                  onClick={() => exportToCSV('invoices_operational_report', invoicesReport)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>INVOICE #</th>
                      <th style={{ padding: '0.85rem 1rem' }}>CUSTOMER</th>
                      <th style={{ padding: '0.85rem 1rem' }}>PRODUCT / CHASSIS</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GROSS TOTAL</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>OUTSTANDING</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoicesReport.map((inv) => (
                      <tr key={inv.invoice_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700 }}>{inv.invoice_number}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{inv.customer_name}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div>{inv.item_name}</div>
                          {inv.chassis_number && (
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#00D2D3' }}>{inv.chassis_number}</div>
                          )}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{formatETB(inv.gross_total)}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: Number(inv.outstanding_balance) > 0 ? '#EF4444' : '#10B981' }}>
                          {formatETB(inv.outstanding_balance)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: inv.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: inv.status === 'APPROVED' ? '#10B981' : '#F59E0B',
                            }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>Vehicle Deliveries & Handover Operational Report</div>
                <button
                  onClick={() => exportToCSV('deliveries_operational_report', deliveriesReport)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>DELIVERY #</th>
                      <th style={{ padding: '0.85rem 1rem' }}>CUSTOMER</th>
                      <th style={{ padding: '0.85rem 1rem' }}>CHASSIS / VIN</th>
                      <th style={{ padding: '0.85rem 1rem' }}>ENGINE NUMBER</th>
                      <th style={{ padding: '0.85rem 1rem' }}>RESPONSIBLE OFFICER</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveriesReport.map((del) => (
                      <tr key={del.delivery_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontWeight: 700 }}>{del.delivery_number}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{del.customer_name || '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3' }}>{del.chassis_number}</td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace' }}>{del.engine_number}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>{del.responsible_employee || 'Unassigned'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: del.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: del.status === 'APPROVED' ? '#10B981' : '#F59E0B',
                            }}
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
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Sales Enquiries Status Distribution</div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>STATUS</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ENQUIRIES COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>PIPELINE VALUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiriesReport.map((enq, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{enq.status}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{enq.enquiry_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#00D2D3' }}>{formatETB(enq.pipeline_value)}</td>
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
              <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Advance Bookings Distribution</div>
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>BOOKING STATUS</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>COUNT</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>BOOKING FEES</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>DEPOSITS PAID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsReport.map((bk, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{bk.status}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{bk.booking_count}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{formatETB(bk.total_fees)}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#10B981' }}>{formatETB(bk.total_deposits_paid)}</td>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Current Stock Balances & Reorder Points</div>
            <button
              onClick={() => exportToCSV('inventory_stock_balance_report', stockReport)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', marginBottom: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ITEM CODE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>PRODUCT NAME</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ON HAND</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>RESERVED</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>AVAILABLE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>REORDER POINT</th>
                </tr>
              </thead>
              <tbody>
                {stockReport.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{item.warehouse_name}</td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3' }}>{item.item_code}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{item.item_name}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>{item.quantity_on_hand}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#F59E0B' }}>{item.quantity_reserved}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: item.quantity_available <= item.reorder_level ? '#EF4444' : '#10B981' }}>
                      {item.quantity_available}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{item.reorder_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Fleet Lifecycle Status Distribution</div>
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MODEL</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS COUNT</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStatusReport.map((vr, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>{vr.warehouse_name || 'All Warehouses'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{vr.model_name || 'All Models'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{vr.status}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#00D2D3' }}>{vr.vehicle_count}</td>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Customer Financial Ledger & Receivables Summary</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Aggregates customer ledger entries (Stories CF1 - CF5)
              </div>
            </div>
            <button
              onClick={() => exportToCSV('customer_financial_summary', financialSummary)}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>CUSTOMER CODE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CUSTOMER NAME</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TYPE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL DEBITED</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TOTAL CREDITED</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>NET RECEIVABLE</th>
                </tr>
              </thead>
              <tbody>
                {financialSummary.map((f) => (
                  <tr key={f.customer_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3' }}>{f.customer_code}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{f.full_name}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {f.customer_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>{formatETB(f.total_debited)}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#10B981' }}>{formatETB(f.total_credited)}</td>
                    <td
                      style={{
                        padding: '0.85rem 1rem',
                        textAlign: 'right',
                        fontWeight: 800,
                        color: Number(f.net_receivable) > 0 ? '#EF4444' : '#10B981',
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
