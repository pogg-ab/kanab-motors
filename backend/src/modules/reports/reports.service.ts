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

    const financialKpis = await this.dataSource.query(
      `
      SELECT
        (SELECT COUNT(*)
           FROM booking
          WHERE booking_date::date BETWEEN $1::date AND $2::date) AS total_bookings,
        (SELECT COALESCE(SUM(amount), 0)
           FROM customer_payment
          WHERE status = 'CONFIRMED'
            AND payment_date::date BETWEEN $1::date AND $2::date) AS total_customer_deposits,
        (SELECT COALESCE(SUM(debit_amount - credit_amount), 0)
           FROM customer_ledger_transaction
          WHERE transaction_date::date <= $2::date) AS outstanding_customer_balance,
        (SELECT COALESCE(SUM(available_credit), 0)
           FROM customer_account_summary) AS customer_credit_balance,
        (SELECT COALESCE(SUM(excess_payments), 0)
           FROM customer_account_summary) AS excess_payments,
        (SELECT COUNT(*)
           FROM customer_refund
          WHERE status IN ('REQUESTED', 'REVIEWED', 'APPROVED')
            AND created_at::date BETWEEN $1::date AND $2::date) AS pending_refunds,
        (SELECT COUNT(*)
           FROM customer_refund
          WHERE status IN ('FINANCE_PROCESSED', 'CONFIRMED')
            AND created_at::date BETWEEN $1::date AND $2::date) AS processed_refunds
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

  // =========================================================================
  // 5. CREDIT SALES REPORT (KMSI-14-07)
  // =========================================================================
  async getCreditSalesReport(filters?: { startDate?: string; endDate?: string; customerId?: string; status?: string }): Promise<any> {
    let query = `
      WITH credit_records AS (
        SELECT 
          'VEHICLE' AS sale_type,
          si.invoice_id::text AS id,
          si.invoice_number AS reference_number,
          si.customer_id::text AS customer_id,
          c.full_name AS customer_name,
          p.item_name AS item_description,
          si.created_at::date AS sale_date,
          si.net_payable AS total_amount,
          si.deposits_applied AS amount_paid,
          si.outstanding_balance AS outstanding_balance,
          (si.created_at::date + interval '30 days')::date AS due_date,
          CASE 
            WHEN si.outstanding_balance <= 0 THEN 'PAID'
            WHEN (si.created_at::date + interval '30 days') < CURRENT_DATE THEN 'OVERDUE'
            WHEN si.deposits_applied > 0 THEN 'PARTIALLY_PAID'
            ELSE 'UNPAID'
          END AS payment_status
        FROM sales_invoice si
        JOIN customer c ON c.customer_id = si.customer_id
        JOIN product_item p ON p.item_id = si.item_id
        WHERE si.status = 'APPROVED'
        
        UNION ALL
        
        SELECT 
          'SPARE_PARTS' AS sale_type,
          sps.sale_id::text AS id,
          sps.sale_number AS reference_number,
          COALESCE(sps.customer_id::text, '0') AS customer_id,
          COALESCE(c.full_name, sps.customer_name) AS customer_name,
          'Spare Parts POS Counter Sale' AS item_description,
          sps.sale_date::date AS sale_date,
          sps.grand_total AS total_amount,
          COALESCE(sps.amount_paid, 0) AS amount_paid,
          COALESCE(sps.outstanding_balance, sps.grand_total - COALESCE(sps.amount_paid, 0)) AS outstanding_balance,
          COALESCE(sps.credit_due_date, (sps.sale_date::date + interval '30 days')::date) AS due_date,
          CASE 
            WHEN COALESCE(sps.outstanding_balance, sps.grand_total - COALESCE(sps.amount_paid, 0)) <= 0 THEN 'PAID'
            WHEN COALESCE(sps.credit_due_date, (sps.sale_date::date + interval '30 days')::date) < CURRENT_DATE THEN 'OVERDUE'
            WHEN COALESCE(sps.amount_paid, 0) > 0 THEN 'PARTIALLY_PAID'
            ELSE 'UNPAID'
          END AS payment_status
        FROM spare_parts_sale sps
        LEFT JOIN customer c ON c.customer_id = sps.customer_id
        WHERE sps.status = 'COMPLETED' AND (sps.payment_method = 'CREDIT' OR sps.outstanding_balance > 0)
      )
      SELECT * FROM credit_records WHERE 1=1
    `;

    const params: any[] = [];
    if (filters?.startDate) {
      params.push(filters.startDate);
      query += ` AND sale_date >= $${params.length}`;
    }
    if (filters?.endDate) {
      params.push(filters.endDate);
      query += ` AND sale_date <= $${params.length}`;
    }
    if (filters?.customerId) {
      params.push(filters.customerId);
      query += ` AND customer_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      query += ` AND payment_status = $${params.length}`;
    }

    query += ` ORDER BY sale_date DESC`;

    const items = await this.dataSource.query(query, params);

    const summary = {
      totalCreditSales: items.reduce((acc: number, curr: any) => acc + Number(curr.total_amount || 0), 0),
      totalCollected: items.reduce((acc: number, curr: any) => acc + Number(curr.amount_paid || 0), 0),
      totalOutstanding: items.reduce((acc: number, curr: any) => acc + Number(curr.outstanding_balance || 0), 0),
      overdueAmount: items.filter((i: any) => i.payment_status === 'OVERDUE').reduce((acc: number, curr: any) => acc + Number(curr.outstanding_balance || 0), 0),
      fullySettledCount: items.filter((i: any) => i.payment_status === 'PAID').length,
      totalRecords: items.length,
    };

    return { summary, items };
  }

  // =========================================================================
  // 6. STOCK AGING TRACKING (KMSI-14-08)
  // =========================================================================
  async getStockAgingReport(filters?: { warehouseId?: number; itemType?: string; agingBucket?: string }): Promise<any> {
    let query = `
      WITH stock_entries AS (
        SELECT 
          'VEHICLE' AS item_type,
          vu.vehicle_unit_id::text AS id,
          vu.chassis_number AS identifier,
          vu.engine_number AS secondary_identifier,
          pi.item_name AS item_name,
          COALESCE(b.brand_name, 'Kanab') AS brand_name,
          COALESCE(pi.model, 'Standard') AS model,
          COALESCE(w.warehouse_name, 'Main Warehouse') AS warehouse_name,
          vu.current_warehouse_id AS warehouse_id,
          vu.created_at::date AS stock_entry_date,
          (CURRENT_DATE - vu.created_at::date)::int AS age_in_days,
          CASE 
            WHEN (CURRENT_DATE - vu.created_at::date) <= 30 THEN '0_TO_30_DAYS'
            WHEN (CURRENT_DATE - vu.created_at::date) <= 60 THEN '31_TO_60_DAYS'
            WHEN (CURRENT_DATE - vu.created_at::date) <= 90 THEN '61_TO_90_DAYS'
            WHEN (CURRENT_DATE - vu.created_at::date) <= 180 THEN '91_TO_180_DAYS'
            ELSE 'OVER_180_DAYS'
          END AS aging_bucket,
          vu.current_status AS status,
          COALESCE(vu.ownership_status, 'COMPANY_OWNED') AS ownership_status,
          c.full_name AS custody_customer_name,
          COALESCE(pi.selling_price, 0) AS unit_value
        FROM vehicle_unit vu
        JOIN product_item pi ON pi.item_id = vu.item_id
        LEFT JOIN brand b ON b.brand_id = pi.brand_id
        LEFT JOIN warehouse w ON w.warehouse_id = vu.current_warehouse_id
        LEFT JOIN customer c ON c.customer_id = vu.custody_customer_id
        WHERE vu.current_status != 'DELIVERED'
        
        UNION ALL
        
        SELECT 
          'SPARE_PART' AS item_type,
          pi.item_id::text AS id,
          COALESCE(pi.part_number, pi.item_code) AS identifier,
          pi.item_code AS secondary_identifier,
          pi.item_name AS item_name,
          COALESCE(b.brand_name, 'OEM') AS brand_name,
          COALESCE(pi.model, 'Spare Part') AS model,
          COALESCE(w.warehouse_name, 'Spare Parts Depot') AS warehouse_name,
          sb.warehouse_id AS warehouse_id,
          sb.created_at::date AS stock_entry_date,
          (CURRENT_DATE - sb.created_at::date)::int AS age_in_days,
          CASE 
            WHEN (CURRENT_DATE - sb.created_at::date) <= 30 THEN '0_TO_30_DAYS'
            WHEN (CURRENT_DATE - sb.created_at::date) <= 60 THEN '31_TO_60_DAYS'
            WHEN (CURRENT_DATE - sb.created_at::date) <= 90 THEN '61_TO_90_DAYS'
            WHEN (CURRENT_DATE - sb.created_at::date) <= 180 THEN '91_TO_180_DAYS'
            ELSE 'OVER_180_DAYS'
          END AS aging_bucket,
          'IN_STOCK' AS status,
          'COMPANY_OWNED' AS ownership_status,
          NULL AS custody_customer_name,
          (sb.current_balance * pi.selling_price) AS unit_value
        FROM stock_balance sb
        JOIN product_item pi ON pi.item_id = sb.item_id
        LEFT JOIN brand b ON b.brand_id = pi.brand_id
        LEFT JOIN warehouse w ON w.warehouse_id = sb.warehouse_id
        WHERE sb.current_balance > 0 AND pi.item_type != 'VEHICLE'
      )
      SELECT * FROM stock_entries WHERE 1=1
    `;

    const params: any[] = [];
    if (filters?.warehouseId) {
      params.push(filters.warehouseId);
      query += ` AND warehouse_id = $${params.length}`;
    }
    if (filters?.itemType) {
      params.push(filters.itemType);
      query += ` AND item_type = $${params.length}`;
    }
    if (filters?.agingBucket) {
      params.push(filters.agingBucket);
      query += ` AND aging_bucket = $${params.length}`;
    }

    query += ` ORDER BY age_in_days DESC`;

    const items = await this.dataSource.query(query, params);

    const buckets = {
      '0_TO_30_DAYS': items.filter((i: any) => i.aging_bucket === '0_TO_30_DAYS').length,
      '31_TO_60_DAYS': items.filter((i: any) => i.aging_bucket === '31_TO_60_DAYS').length,
      '61_TO_90_DAYS': items.filter((i: any) => i.aging_bucket === '61_TO_90_DAYS').length,
      '91_TO_180_DAYS': items.filter((i: any) => i.aging_bucket === '91_TO_180_DAYS').length,
      'OVER_180_DAYS': items.filter((i: any) => i.aging_bucket === 'OVER_180_DAYS').length,
    };

    const totalValuation = items.reduce((acc: number, curr: any) => acc + Number(curr.unit_value || 0), 0);

    return {
      buckets,
      totalItems: items.length,
      totalValuation,
      customerOwnedRetainedCount: items.filter((i: any) => i.ownership_status === 'CUSTOMER_OWNED').length,
      items,
    };
  }
}
