import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairManagementDashboardDateFilters1710950000000 implements MigrationInterface {
  name = 'RepairManagementDashboardDateFilters1710950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
          WITH status_as_of AS (
              SELECT
                  vu.vehicle_unit_id,
                  COALESCE(latest_before.to_status, first_after.from_status, vu.current_status) AS status_as_of_end_date
              FROM vehicle_unit vu
              LEFT JOIN LATERAL (
                  SELECT vsh.to_status
                  FROM vehicle_status_history vsh
                  WHERE vsh.vehicle_unit_id = vu.vehicle_unit_id
                    AND vsh.changed_at < (p_end_date + INTERVAL '1 day')
                  ORDER BY vsh.changed_at DESC, vsh.status_history_id DESC
                  LIMIT 1
              ) latest_before ON TRUE
              LEFT JOIN LATERAL (
                  SELECT vsh.from_status
                  FROM vehicle_status_history vsh
                  WHERE vsh.vehicle_unit_id = vu.vehicle_unit_id
                    AND vsh.changed_at >= (p_end_date + INTERVAL '1 day')
                  ORDER BY vsh.changed_at ASC, vsh.status_history_id ASC
                  LIMIT 1
              ) first_after ON latest_before.to_status IS NULL
              WHERE vu.created_at < (p_end_date + INTERVAL '1 day')
          )
          SELECT
              p_start_date,
              p_end_date,
              COALESCE((
                  SELECT SUM(gross_total) FROM sales_invoice
                  WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date
              ), 0::NUMERIC(18,2)),
              (SELECT COUNT(*) FROM sales_invoice
                  WHERE status = 'APPROVED' AND created_at::date BETWEEN p_start_date AND p_end_date),
              (SELECT COUNT(*) FROM status_as_of WHERE status_as_of_end_date = 'AVAILABLE_FOR_SALE'),
              (SELECT COUNT(*) FROM status_as_of WHERE status_as_of_end_date = 'RESERVED'),
              (SELECT COUNT(*) FROM allotment WHERE status = 'REQUESTED' AND requested_at::date BETWEEN p_start_date AND p_end_date),
              (SELECT COUNT(*) FROM status_as_of WHERE status_as_of_end_date = 'READY_FOR_DELIVERY');
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
  }
}
