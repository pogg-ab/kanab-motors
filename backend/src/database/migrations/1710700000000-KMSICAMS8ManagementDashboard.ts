import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS8ManagementDashboard1710700000000 implements MigrationInterface {
  name = 'KMSICAMS8ManagementDashboard1710700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. fn_management_dashboard_summary
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_management_dashboard_summary(
          p_start_date DATE DEFAULT CURRENT_DATE,
          p_end_date   DATE DEFAULT CURRENT_DATE
      ) RETURNS TABLE (
          period_start                DATE,
          period_end                  DATE,
          total_sales                 NUMERIC(18,2),
          invoice_count                BIGINT,
          vehicles_available           BIGINT,
          vehicles_reserved            BIGINT,
          pending_allotment_requests   BIGINT,
          vehicles_ready_for_delivery  BIGINT
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT
              p_start_date,
              p_end_date,
              COALESCE((
                  SELECT SUM(gross_total) FROM sales_invoice
                  WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date
              ), 0::NUMERIC(18,2)),
              (SELECT COUNT(*) FROM sales_invoice
                  WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date),
              (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'AVAILABLE_FOR_SALE'),
              (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'RESERVED'),
              (SELECT COUNT(*) FROM allotment WHERE status = 'REQUESTED'),
              (SELECT COUNT(*) FROM vehicle_unit WHERE current_status = 'READY_FOR_DELIVERY');
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);

    // 2. fn_sales_performance_by_product_and_salesperson
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_sales_performance_by_product_and_salesperson(
          p_start_date DATE DEFAULT CURRENT_DATE,
          p_end_date   DATE DEFAULT CURRENT_DATE
      ) RETURNS TABLE (
          salesperson_id    INT,
          salesperson_name  VARCHAR(200),
          item_id           BIGINT,
          item_name         VARCHAR(200),
          model             VARCHAR(100),
          invoice_count     BIGINT,
          units_sold        NUMERIC(12,2),
          total_sales       NUMERIC(18,2)
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT
              u.user_id, u.full_name,
              pi.item_id, pi.item_name, pi.model,
              COUNT(*),
              SUM(si.quantity),
              SUM(si.gross_total)
          FROM sales_invoice si
          JOIN app_user u ON u.user_id = si.salesperson_id
          JOIN product_item pi ON pi.item_id = si.item_id
          WHERE si.status = 'APPROVED' AND si.created_at::date BETWEEN p_start_date AND p_end_date
          GROUP BY u.user_id, u.full_name, pi.item_id, pi.item_name, pi.model
          ORDER BY SUM(si.gross_total) DESC;
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_sales_performance_by_product_and_salesperson(DATE, DATE);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_management_dashboard_summary(DATE, DATE);`);
  }
}
