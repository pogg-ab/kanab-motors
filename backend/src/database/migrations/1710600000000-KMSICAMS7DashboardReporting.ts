import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS7DashboardReporting1710600000000 implements MigrationInterface {
  name = 'KMSICAMS7DashboardReporting1710600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Retroactive column on sales_invoice
    await queryRunner.query(`
      ALTER TABLE sales_invoice
      ADD COLUMN IF NOT EXISTS salesperson_id INT REFERENCES app_user(user_id);
    `);

    // 2. Sales Reports Views
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_daily_sales_report AS
      SELECT
          created_at::date AS sales_date,
          COUNT(*) AS invoice_count,
          SUM(quantity) AS units_sold,
          SUM(gross_total) AS total_sales
      FROM sales_invoice
      WHERE status = 'APPROVED'
      GROUP BY created_at::date
      ORDER BY sales_date DESC;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_monthly_sales_report AS
      SELECT
          DATE_TRUNC('month', created_at)::date AS sales_month,
          COUNT(*) AS invoice_count,
          SUM(quantity) AS units_sold,
          SUM(gross_total) AS total_sales
      FROM sales_invoice
      WHERE status = 'APPROVED'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY sales_month DESC;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_vehicle_type AS
      SELECT
          pc.category_name,
          COUNT(*) AS invoice_count,
          SUM(si.quantity) AS units_sold,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN product_item pi ON pi.item_id = si.item_id
      JOIN product_category pc ON pc.category_id = pi.category_id
      WHERE si.status = 'APPROVED'
      GROUP BY pc.category_name;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_model AS
      SELECT
          pi.model,
          pi.item_name,
          COUNT(*) AS invoice_count,
          SUM(si.quantity) AS units_sold,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN product_item pi ON pi.item_id = si.item_id
      WHERE si.status = 'APPROVED'
      GROUP BY pi.model, pi.item_name;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_customer AS
      SELECT
          c.customer_id, c.customer_code, c.full_name,
          COUNT(*) AS invoice_count,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN customer c ON c.customer_id = si.customer_id
      WHERE si.status = 'APPROVED'
      GROUP BY c.customer_id, c.customer_code, c.full_name;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_region AS
      SELECT
          COALESCE(r.region_name, 'Unassigned') AS region_name,
          COUNT(*) AS invoice_count,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN customer c ON c.customer_id = si.customer_id
      LEFT JOIN region r ON r.region_id = c.region_id
      WHERE si.status = 'APPROVED'
      GROUP BY r.region_name;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_customer_type AS
      SELECT
          c.customer_type,
          COUNT(*) AS invoice_count,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN customer c ON c.customer_id = si.customer_id
      WHERE si.status = 'APPROVED'
      GROUP BY c.customer_type;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_sales_by_salesperson AS
      SELECT
          u.user_id AS salesperson_id, u.full_name AS salesperson_name,
          COUNT(*) AS invoice_count,
          SUM(si.gross_total) AS total_sales
      FROM sales_invoice si
      JOIN app_user u ON u.user_id = si.salesperson_id
      WHERE si.status = 'APPROVED'
      GROUP BY u.user_id, u.full_name;
    `);

    // 3. Operational Reports Views
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_invoice_report AS
      SELECT
          si.invoice_id, si.invoice_number, si.status, si.created_at,
          c.customer_code, c.full_name AS customer_name,
          pi.item_name, vu.chassis_number,
          si.quantity, si.unit_price, si.vat_amount, si.gross_total, si.outstanding_balance
      FROM sales_invoice si
      JOIN customer c ON c.customer_id = si.customer_id
      JOIN product_item pi ON pi.item_id = si.item_id
      LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = si.vehicle_unit_id;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_delivery_report AS
      SELECT
          d.delivery_id, d.delivery_number, d.status, d.delivery_date, d.delivered_at,
          vu.chassis_number, vu.engine_number,
          emp.full_name AS responsible_employee,
          si.invoice_number, c.full_name AS customer_name
      FROM delivery d
      JOIN vehicle_unit vu ON vu.vehicle_unit_id = d.vehicle_unit_id
      LEFT JOIN app_user emp ON emp.user_id = d.responsible_employee
      LEFT JOIN sales_invoice si ON si.vehicle_unit_id = d.vehicle_unit_id AND si.status = 'APPROVED'
      LEFT JOIN customer c ON c.customer_id = si.customer_id;
    `);

    // 4. Executive Dashboard Summary View
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_dashboard_summary AS
      SELECT
          (SELECT COALESCE(SUM(gross_total), 0) FROM sales_invoice
              WHERE status = 'APPROVED' AND created_at::date = CURRENT_DATE) AS todays_sales,
          (SELECT COUNT(*) FROM sales_invoice
              WHERE status = 'APPROVED' AND created_at::date = CURRENT_DATE) AS todays_invoice_count,
          (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'AVAILABLE_FOR_SALE') AS vehicles_available,
          (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'RESERVED') AS vehicles_reserved,
          (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'ALLOTTED') AS vehicles_allotted,
          (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'SOLD') AS vehicles_sold,
          (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'DELIVERED') AS vehicles_delivered,
          (SELECT COUNT(*) FROM approval_request WHERE status = 'PENDING') AS pending_approvals,
          (SELECT COUNT(*) FROM allotment WHERE status = 'REQUESTED') AS pending_allotments;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_dashboard_summary CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_delivery_report CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_invoice_report CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_salesperson CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_customer_type CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_region CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_customer CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_model CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_sales_by_vehicle_type CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_monthly_sales_report CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_daily_sales_report CASCADE;`);
    await queryRunner.query(`ALTER TABLE sales_invoice DROP COLUMN IF EXISTS salesperson_id;`);
  }
}
