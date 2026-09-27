import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) {}

  // =========================================================================
  // 1. EXECUTIVE DASHBOARD SUMMARY (Story DB1, DB2)
  // =========================================================================
  async getDashboardSummary(): Promise<any> {
    const raw = await this.dataSource.query(`SELECT * FROM vw_dashboard_summary`);
    const summary = raw[0] || {};

    // Supplementary real-time metrics
    const financialMetrics = await this.dataSource.query(`
      SELECT
        (SELECT COALESCE(SUM(debit_amount), 0) FROM customer_ledger_transaction) AS total_invoiced,
        (SELECT COALESCE(SUM(credit_amount), 0) FROM customer_ledger_transaction) AS total_collected,
        (SELECT COALESCE(SUM(debit_amount - credit_amount), 0) FROM customer_ledger_transaction) AS total_receivables,
        (SELECT COUNT(*) FROM booking WHERE booking_status = 'CONFIRMED') AS active_confirmed_bookings,
        (SELECT COUNT(*) FROM sales_enquiry WHERE status = 'SUBMITTED') AS open_enquiries,
        (SELECT COUNT(*) FROM customer WHERE is_active = true) AS active_customers,
        (SELECT COUNT(*) FROM shipment WHERE current_stage != 'RECEIVED') AS active_shipments
    `);

    return {
      ...summary,
      ...(financialMetrics[0] || {}),
    };
  }

  // =========================================================================
  // 1B. MANAGEMENT DASHBOARD ENGINE (KMSICAMS-8)
  // =========================================================================
  async getManagementDashboardSummary(startDate?: string, endDate?: string): Promise<any> {
    const today = new Date().toISOString().split('T')[0];
    const sDate = startDate || today;
    const eDate = endDate || today;

    // Call stored procedure from kanab_motors_schema_management_dashboard.sql
    const raw = await this.dataSource.query(
      `SELECT * FROM fn_management_dashboard_summary($1::date, $2::date)`,
      [sDate, eDate],
    );
    const summary = raw[0] || {};

    // 7 Real-data metrics linking to Booking, Payment, Ledger, Excess, and Refunds (Stories G1, G2)
    const financialKpis = await this.dataSource.query(
      `
      SELECT
        (SELECT COUNT(*) FROM booking WHERE created_at::date BETWEEN $1::date AND $2::date) AS total_bookings,
        (SELECT COALESCE(SUM(amount), 0) FROM customer_payment WHERE created_at::date BETWEEN $1::date AND $2::date) AS total_customer_deposits,
        (SELECT COALESCE(SUM(debit_amount - credit_amount), 0) FROM customer_ledger_transaction) AS outstanding_customer_balance,
        (SELECT COALESCE(SUM(available_credit), 0) FROM customer_account_summary) AS customer_credit_balance,
        (SELECT COALESCE(SUM(excess_payments), 0) FROM customer_account_summary) AS excess_payments,
        (SELECT COUNT(*) FROM customer_refund WHERE status = 'REQUESTED') AS pending_refunds,
        (SELECT COUNT(*) FROM customer_refund WHERE status IN ('APPROVED', 'FINANCE_PROCESSED', 'CONFIRMED')) AS processed_refunds
    `,
      [sDate, eDate],
    );

    return {
      ...summary,
      ...(financialKpis[0] || {}),
    };
  }

  async getSalesPerformanceCrossTab(startDate?: string, endDate?: string): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const sDate = startDate || today;
    const eDate = endDate || today;

    return this.dataSource.query(
      `SELECT * FROM fn_sales_performance_by_product_and_salesperson($1::date, $2::date)`,
      [sDate, eDate],
    );
  }

  // =========================================================================
  // 2. SALES REPORTS (Stories SR1 - SR5)
  // =========================================================================
  async getDailySalesReport(params?: { startDate?: string; endDate?: string }): Promise<any[]> {
    if (params?.startDate && params?.endDate) {
      return this.dataSource.query(
        `SELECT * FROM vw_daily_sales_report WHERE sales_date BETWEEN $1 AND $2 ORDER BY sales_date DESC`,
        [params.startDate, params.endDate],
      );
    }
    return this.dataSource.query(`SELECT * FROM vw_daily_sales_report ORDER BY sales_date DESC LIMIT 30`);
  }

  async getMonthlySalesReport(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_monthly_sales_report ORDER BY sales_month DESC LIMIT 12`);
  }

  async getSalesByVehicleType(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_vehicle_type ORDER BY total_sales DESC`);
  }

  async getSalesByModel(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_model ORDER BY total_sales DESC`);
  }

  async getSalesByCustomer(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_customer ORDER BY total_sales DESC LIMIT 50`);
  }

  async getSalesByRegion(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_region ORDER BY total_sales DESC`);
  }

  async getSalesByCustomerType(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_customer_type ORDER BY total_sales DESC`);
  }

  async getSalesBySalesperson(): Promise<any[]> {
    return this.dataSource.query(`SELECT * FROM vw_sales_by_salesperson ORDER BY total_sales DESC`);
  }

  // =========================================================================
  // 3. OPERATIONAL REPORTS (Stories OR1 - OR6)
  // =========================================================================
  async getInvoiceReport(params?: { status?: string; limit?: number }): Promise<any[]> {
    const limit = params?.limit || 100;
    if (params?.status && params.status !== 'ALL') {
      return this.dataSource.query(
        `SELECT * FROM vw_invoice_report WHERE status = $1 ORDER BY created_at DESC LIMIT $2`,
        [params.status, limit],
      );
    }
    return this.dataSource.query(`SELECT * FROM vw_invoice_report ORDER BY created_at DESC LIMIT $1`, [limit]);
  }

  async getDeliveryReport(params?: { status?: string; limit?: number }): Promise<any[]> {
    const limit = params?.limit || 100;
    if (params?.status && params.status !== 'ALL') {
      return this.dataSource.query(
        `SELECT * FROM vw_delivery_report WHERE status = $1 ORDER BY delivery_date DESC NULLS LAST LIMIT $2`,
        [params.status, limit],
      );
    }
    return this.dataSource.query(`SELECT * FROM vw_delivery_report ORDER BY delivery_date DESC NULLS LAST LIMIT $1`, [limit]);
  }

  async getEnquiriesReport(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        status,
        COUNT(*) AS enquiry_count,
        COALESCE(SUM(estimated_sales_value), 0) AS pipeline_value
      FROM sales_enquiry
      GROUP BY status
    `);
  }

  async getBookingsReport(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        booking_status AS status,
        COUNT(*) AS booking_count,
        COALESCE(SUM(required_advance_amount), 0) AS total_fees,
        COALESCE(SUM(total_amount_deposited), 0) AS total_deposits_paid
      FROM booking
      GROUP BY booking_status
    `);
  }

  // =========================================================================
  // 4. FINANCIAL REPORTS (Stories CF1 - CF5)
  // =========================================================================
  async getCustomerFinancialSummary(): Promise<any[]> {
    return this.dataSource.query(`
      SELECT
        c.customer_id,
        c.customer_code,
        c.full_name,
        c.customer_type,
        COALESCE(SUM(cle.debit_amount), 0) AS total_debited,
        COALESCE(SUM(cle.credit_amount), 0) AS total_credited,
        COALESCE(SUM(cle.debit_amount - cle.credit_amount), 0) AS net_receivable
      FROM customer c
      LEFT JOIN customer_ledger_transaction cle ON cle.customer_id = c.customer_id
      GROUP BY c.customer_id, c.customer_code, c.full_name, c.customer_type
      ORDER BY net_receivable DESC
      LIMIT 100
    `);
  }
}
