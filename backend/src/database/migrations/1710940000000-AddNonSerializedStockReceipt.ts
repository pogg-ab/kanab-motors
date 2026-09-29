import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNonSerializedStockReceipt1710940000000 implements MigrationInterface {
  name = 'AddNonSerializedStockReceipt1710940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE stock_receipt_source_enum AS ENUM ('OPENING_BALANCE', 'LOCAL_PURCHASE', 'MANUAL_RECEIPT', 'CORRECTION');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS stock_receipt (
        stock_receipt_id BIGSERIAL PRIMARY KEY,
        warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
        source_type stock_receipt_source_enum NOT NULL,
        notes TEXT,
        received_by INT REFERENCES app_user(user_id),
        received_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_stock_receipt_warehouse ON stock_receipt(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_stock_receipt_item ON stock_receipt(item_id);
    `);

    await queryRunner.query(`DROP VIEW IF EXISTS vw_stock_movement_history;`);
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_stock_movement_history AS
      WITH raw_movements AS (
        SELECT
          ('receipt-' || sr.receipt_id::text) AS movement_id,
          'RECEIPT'::text AS movement_type,
          sr.received_at AS movement_at,
          sr.warehouse_id,
          pol.item_id,
          NULL::BIGINT AS vehicle_unit_id,
          sr.quantity_received::NUMERIC AS quantity,
          'shipment_receipt'::text AS reference_type,
          sr.receipt_id::TEXT AS reference_id,
          sr.received_by AS performed_by
        FROM shipment_receipt sr
        JOIN shipment_line sl ON sl.shipment_line_id = sr.shipment_line_id
        JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id

        UNION ALL

        SELECT
          ('stock-receipt-' || str.stock_receipt_id::text) AS movement_id,
          str.source_type::text AS movement_type,
          str.received_at AS movement_at,
          str.warehouse_id,
          str.item_id,
          NULL::BIGINT AS vehicle_unit_id,
          str.quantity::NUMERIC AS quantity,
          'stock_receipt'::text AS reference_type,
          str.stock_receipt_id::TEXT AS reference_id,
          str.received_by AS performed_by
        FROM stock_receipt str

        UNION ALL

        SELECT
          ('transfer-out-' || st.transfer_id::text || '-' || stl.transfer_line_id::text) AS movement_id,
          'TRANSFER_OUT'::text AS movement_type,
          st.completed_at AS movement_at,
          st.from_warehouse_id AS warehouse_id,
          COALESCE(stl.item_id, vu.item_id) AS item_id,
          stl.vehicle_unit_id,
          -COALESCE(stl.quantity, 1)::NUMERIC AS quantity,
          'stock_transfer'::text AS reference_type,
          st.transfer_id::TEXT AS reference_id,
          st.approved_by AS performed_by
        FROM stock_transfer st
        JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
        LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = stl.vehicle_unit_id
        WHERE st.status = 'COMPLETED'

        UNION ALL

        SELECT
          ('transfer-in-' || st.transfer_id::text || '-' || stl.transfer_line_id::text) AS movement_id,
          'TRANSFER_IN'::text AS movement_type,
          st.completed_at AS movement_at,
          st.to_warehouse_id AS warehouse_id,
          COALESCE(stl.item_id, vu.item_id) AS item_id,
          stl.vehicle_unit_id,
          COALESCE(stl.quantity, 1)::NUMERIC AS quantity,
          'stock_transfer'::text AS reference_type,
          st.transfer_id::TEXT AS reference_id,
          st.approved_by AS performed_by
        FROM stock_transfer st
        JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
        LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = stl.vehicle_unit_id
        WHERE st.status = 'COMPLETED'

        UNION ALL

        SELECT
          ('adjustment-' || sa.adjustment_id::text) AS movement_id,
          'ADJUSTMENT'::text AS movement_type,
          sa.approved_at AS movement_at,
          sa.warehouse_id,
          COALESCE(sa.item_id, vu.item_id) AS item_id,
          sa.vehicle_unit_id,
          COALESCE(sa.quantity_delta, 0)::NUMERIC AS quantity,
          'stock_adjustment'::text AS reference_type,
          sa.adjustment_id::TEXT AS reference_id,
          sa.approved_by AS performed_by
        FROM stock_adjustment sa
        LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = sa.vehicle_unit_id
        WHERE sa.status = 'APPROVED'

        UNION ALL

        SELECT
          ('vehicle-status-' || vsh.status_history_id::text) AS movement_id,
          'VEHICLE_STATUS_CHANGE'::text AS movement_type,
          vsh.changed_at AS movement_at,
          vu.current_warehouse_id AS warehouse_id,
          vu.item_id,
          vsh.vehicle_unit_id,
          NULL::NUMERIC AS quantity,
          'vehicle_status_history'::text AS reference_type,
          vsh.status_history_id::TEXT AS reference_id,
          vsh.triggered_by_user AS performed_by
        FROM vehicle_status_history vsh
        JOIN vehicle_unit vu ON vu.vehicle_unit_id = vsh.vehicle_unit_id
      )
      SELECT
        rm.movement_id,
        rm.movement_at,
        rm.movement_type,
        rm.warehouse_id,
        w.warehouse_name,
        rm.item_id,
        pi.item_code,
        pi.item_name,
        rm.vehicle_unit_id,
        vu.chassis_number,
        rm.quantity,
        rm.reference_type,
        rm.reference_id,
        rm.performed_by,
        u.full_name AS performed_by_name
      FROM raw_movements rm
      LEFT JOIN warehouse w ON w.warehouse_id = rm.warehouse_id
      LEFT JOIN product_item pi ON pi.item_id = rm.item_id
      LEFT JOIN vehicle_unit vu ON vu.vehicle_unit_id = rm.vehicle_unit_id
      LEFT JOIN app_user u ON u.user_id = rm.performed_by;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_stock_movement_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_receipt;`);
    await queryRunner.query(`DROP TYPE IF EXISTS stock_receipt_source_enum;`);
  }
}
