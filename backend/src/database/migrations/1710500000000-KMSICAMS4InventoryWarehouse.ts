import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS4InventoryWarehouse1710500000000 implements MigrationInterface {
  name = 'KMSICAMS4InventoryWarehouse1710500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // =====================================================================
    // 1. EXTEND WAREHOUSE ENTITY & WAREHOUSE-SCOPED ACCESS
    // =====================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE warehouse_type_enum AS ENUM ('MAIN', 'BRANCH', 'SHOWROOM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS warehouse_type warehouse_type_enum NOT NULL DEFAULT 'BRANCH';
      ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS capacity INT;
      ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS manager_user_id INT REFERENCES app_user(user_id);
      ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(30);

      CREATE TABLE IF NOT EXISTS user_warehouse_access (
          user_id      INT NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
          warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, warehouse_id)
      );
    `);

    // =====================================================================
    // 2. PRODUCT ITEM & VEHICLE UNIT EXTENSIONS
    // =====================================================================
    await queryRunner.query(`
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS is_individually_tracked BOOLEAN NOT NULL DEFAULT FALSE;

      -- Mark items with registered vehicles or vehicle categories as individually tracked
      UPDATE product_item SET is_individually_tracked = TRUE
      WHERE category_id IN (
          SELECT category_id FROM product_category
          WHERE category_name ILIKE '%vehicle%' OR category_name ILIKE '%motorcycle%' OR category_name ILIKE '%truck%' OR category_name ILIKE '%car%'
      )
      OR EXISTS (SELECT 1 FROM vehicle_unit vu WHERE vu.item_id = product_item.item_id);

      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS hold_for_inspection BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // =====================================================================
    // 3. VEHICLE STATUS STATE MACHINE
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vehicle_status_transition_rule (
          from_status vehicle_status_enum NOT NULL,
          to_status   vehicle_status_enum NOT NULL,
          PRIMARY KEY (from_status, to_status)
      );

      INSERT INTO vehicle_status_transition_rule (from_status, to_status) VALUES
          ('RECEIVED', 'AVAILABLE_FOR_SALE'),
          ('AVAILABLE_FOR_SALE', 'RESERVED'),
          ('RESERVED', 'ALLOTTED'),
          ('RESERVED', 'AVAILABLE_FOR_SALE'),
          ('ALLOTTED', 'READY_FOR_DELIVERY'),
          ('ALLOTTED', 'AVAILABLE_FOR_SALE'),
          ('READY_FOR_DELIVERY', 'SOLD'),
          ('SOLD', 'DELIVERED')
      ON CONFLICT (from_status, to_status) DO NOTHING;

      CREATE TABLE IF NOT EXISTS vehicle_status_history (
          status_history_id    BIGSERIAL PRIMARY KEY,
          vehicle_unit_id       BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id) ON DELETE CASCADE,
          from_status           vehicle_status_enum,
          to_status             vehicle_status_enum NOT NULL,
          triggered_by_user     INT REFERENCES app_user(user_id),
          triggered_by_module   VARCHAR(50) NOT NULL,
          changed_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
          notes                 TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_vehicle_status_history_unit ON vehicle_status_history(vehicle_unit_id);

      CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
          p_vehicle_unit_id      BIGINT,
          p_to_status            vehicle_status_enum,
          p_triggered_by_user    INT DEFAULT NULL,
          p_triggered_by_module  VARCHAR(50) DEFAULT 'MANUAL',
          p_notes                TEXT DEFAULT NULL
      ) RETURNS void AS $$
      DECLARE
          v_from_status vehicle_status_enum;
          v_rule_exists BOOLEAN;
      BEGIN
          SELECT current_status INTO v_from_status
          FROM vehicle_unit
          WHERE vehicle_unit_id = p_vehicle_unit_id
          FOR UPDATE;

          IF NOT FOUND THEN
              RAISE EXCEPTION 'Vehicle unit % does not exist', p_vehicle_unit_id;
          END IF;

          IF v_from_status = p_to_status THEN
              RETURN;
          END IF;

          SELECT EXISTS (
              SELECT 1 FROM vehicle_status_transition_rule
              WHERE from_status = v_from_status AND to_status = p_to_status
          ) INTO v_rule_exists;

          IF NOT v_rule_exists THEN
              RAISE EXCEPTION 'Invalid vehicle status transition: % -> % (vehicle_unit %)',
                  v_from_status, p_to_status, p_vehicle_unit_id;
          END IF;

          UPDATE vehicle_unit
          SET current_status = p_to_status,
              updated_by = p_triggered_by_user,
              updated_at = now()
          WHERE vehicle_unit_id = p_vehicle_unit_id;

          INSERT INTO vehicle_status_history
              (vehicle_unit_id, from_status, to_status, triggered_by_user, triggered_by_module, notes)
          VALUES
              (p_vehicle_unit_id, v_from_status, p_to_status, p_triggered_by_user, p_triggered_by_module, p_notes);

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, created_at)
              VALUES (
                  'vehicle_unit',
                  p_vehicle_unit_id,
                  p_triggered_by_module,
                  p_triggered_by_user,
                  jsonb_build_object('status', v_from_status),
                  jsonb_build_object('status', p_to_status, 'notes', p_notes),
                  now()
              );
          END IF;
      END;
      $$ LANGUAGE plpgsql;

      CREATE OR REPLACE FUNCTION fn_auto_transition_received_to_available()
      RETURNS TRIGGER AS $$
      BEGIN
          IF NOT NEW.hold_for_inspection AND NEW.current_status = 'RECEIVED' THEN
              PERFORM fn_transition_vehicle_status(
                  NEW.vehicle_unit_id, 'AVAILABLE_FOR_SALE', NEW.created_by, 'INVENTORY_AUTO', 'Auto-activated on receipt'
              );
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_auto_transition_received_to_available ON vehicle_unit;
      CREATE TRIGGER trg_auto_transition_received_to_available
      AFTER INSERT ON vehicle_unit
      FOR EACH ROW EXECUTE FUNCTION fn_auto_transition_received_to_available();
    `);

    // =====================================================================
    // 4. GENERAL (NON-SERIALIZED) STOCK MANAGEMENT
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_balance (
          warehouse_id        INT NOT NULL REFERENCES warehouse(warehouse_id),
          item_id             BIGINT NOT NULL REFERENCES product_item(item_id),
          quantity_on_hand    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
          quantity_reserved   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
          quantity_available  NUMERIC(12,2) GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
          updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
          PRIMARY KEY (warehouse_id, item_id),
          CHECK (quantity_reserved <= quantity_on_hand)
      );

      CREATE OR REPLACE FUNCTION fn_increment_stock_on_receipt()
      RETURNS TRIGGER AS $$
      DECLARE
          v_item_id    BIGINT;
          v_is_tracked BOOLEAN;
      BEGIN
          SELECT pol.item_id, pi.is_individually_tracked
          INTO v_item_id, v_is_tracked
          FROM shipment_line sl
          JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id
          JOIN product_item pi ON pi.item_id = pol.item_id
          WHERE sl.shipment_line_id = NEW.shipment_line_id;

          IF NOT v_is_tracked THEN
              IF NEW.warehouse_id IS NULL THEN
                  RAISE EXCEPTION 'shipment_receipt % must specify warehouse_id for non-serialized item %',
                      NEW.receipt_id, v_item_id;
              END IF;

              INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand)
              VALUES (NEW.warehouse_id, v_item_id, NEW.quantity_received)
              ON CONFLICT (warehouse_id, item_id)
              DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                            updated_at = now();
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_increment_stock_on_receipt ON shipment_receipt;
      CREATE TRIGGER trg_increment_stock_on_receipt
      AFTER INSERT ON shipment_receipt
      FOR EACH ROW EXECUTE FUNCTION fn_increment_stock_on_receipt();

      CREATE OR REPLACE VIEW vw_low_stock_alert AS
      SELECT sb.warehouse_id, w.warehouse_name, sb.item_id, pi.item_code, pi.item_name, sb.quantity_available, pi.reorder_level
      FROM stock_balance sb
      JOIN warehouse w ON w.warehouse_id = sb.warehouse_id
      JOIN product_item pi ON pi.item_id = sb.item_id
      WHERE sb.quantity_available <= pi.reorder_level;
    `);

    // =====================================================================
    // 5. STOCK TRANSFER (BETWEEN WAREHOUSES)
    // =====================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE transfer_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS transfer_number_seq START 1;

      CREATE TABLE IF NOT EXISTS stock_transfer (
          transfer_id       BIGSERIAL PRIMARY KEY,
          transfer_number   VARCHAR(20) NOT NULL UNIQUE
                            DEFAULT ('TRF-' || lpad(nextval('transfer_number_seq')::text, 6, '0')),
          from_warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
          to_warehouse_id   INT NOT NULL REFERENCES warehouse(warehouse_id),
          status            transfer_status_enum NOT NULL DEFAULT 'REQUESTED',
          requested_by      INT REFERENCES app_user(user_id),
          requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          approved_by       INT REFERENCES app_user(user_id),
          approved_at       TIMESTAMPTZ,
          completed_at      TIMESTAMPTZ,
          CHECK (from_warehouse_id <> to_warehouse_id)
      );

      CREATE INDEX IF NOT EXISTS idx_stock_transfer_status ON stock_transfer(status);

      CREATE TABLE IF NOT EXISTS stock_transfer_line (
          transfer_line_id BIGSERIAL PRIMARY KEY,
          transfer_id      BIGINT NOT NULL REFERENCES stock_transfer(transfer_id) ON DELETE CASCADE,
          item_id          BIGINT REFERENCES product_item(item_id),
          quantity         NUMERIC(12,2) CHECK (quantity IS NULL OR quantity > 0),
          vehicle_unit_id  BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
          CHECK (
              (item_id IS NOT NULL AND quantity IS NOT NULL AND vehicle_unit_id IS NULL)
              OR (vehicle_unit_id IS NOT NULL AND item_id IS NULL AND quantity IS NULL)
          )
      );

      CREATE OR REPLACE FUNCTION fn_execute_stock_transfer()
      RETURNS TRIGGER AS $$
      DECLARE
          r RECORD;
          v_current_qty NUMERIC(12,2);
      BEGIN
          IF NEW.status = 'COMPLETED' AND OLD.status <> 'COMPLETED' THEN
              FOR r IN SELECT * FROM stock_transfer_line WHERE transfer_id = NEW.transfer_id LOOP
                  IF r.vehicle_unit_id IS NOT NULL THEN
                      UPDATE vehicle_unit SET current_warehouse_id = NEW.to_warehouse_id, updated_at = now()
                      WHERE vehicle_unit_id = r.vehicle_unit_id;
                  ELSE
                      SELECT quantity_on_hand INTO v_current_qty
                      FROM stock_balance
                      WHERE warehouse_id = NEW.from_warehouse_id AND item_id = r.item_id
                      FOR UPDATE;

                      IF v_current_qty IS NULL OR v_current_qty < r.quantity THEN
                          RAISE EXCEPTION 'Insufficient stock at source warehouse % for item % (have %, need %)',
                              NEW.from_warehouse_id, r.item_id, COALESCE(v_current_qty, 0), r.quantity;
                      END IF;

                      UPDATE stock_balance SET quantity_on_hand = quantity_on_hand - r.quantity, updated_at = now()
                      WHERE warehouse_id = NEW.from_warehouse_id AND item_id = r.item_id;

                      INSERT INTO stock_balance (warehouse_id, item_id, quantity_on_hand)
                      VALUES (NEW.to_warehouse_id, r.item_id, r.quantity)
                      ON CONFLICT (warehouse_id, item_id)
                      DO UPDATE SET quantity_on_hand = stock_balance.quantity_on_hand + EXCLUDED.quantity_on_hand,
                                    updated_at = now();
                  END IF;
              END LOOP;

              NEW.completed_at = now();
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_execute_stock_transfer ON stock_transfer;
      CREATE TRIGGER trg_execute_stock_transfer
      BEFORE UPDATE ON stock_transfer
      FOR EACH ROW EXECUTE FUNCTION fn_execute_stock_transfer();
    `);

    // =====================================================================
    // 6. STOCK ADJUSTMENT
    // =====================================================================
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE adjustment_reason_enum AS ENUM ('DAMAGE', 'LOSS', 'CYCLE_COUNT_CORRECTION', 'OTHER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      DO $$ BEGIN
        CREATE TYPE adjustment_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS adjustment_number_seq START 1;

      CREATE TABLE IF NOT EXISTS stock_adjustment (
          adjustment_id     BIGSERIAL PRIMARY KEY,
          adjustment_number VARCHAR(20) NOT NULL UNIQUE
                            DEFAULT ('ADJ-' || lpad(nextval('adjustment_number_seq')::text, 6, '0')),
          warehouse_id      INT NOT NULL REFERENCES warehouse(warehouse_id),
          item_id           BIGINT REFERENCES product_item(item_id),
          quantity_delta    NUMERIC(12,2),
          vehicle_unit_id   BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
          reason            adjustment_reason_enum NOT NULL,
          reason_notes      TEXT NOT NULL,
          status            adjustment_status_enum NOT NULL DEFAULT 'REQUESTED',
          requested_by      INT REFERENCES app_user(user_id),
          requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
          approved_by       INT REFERENCES app_user(user_id),
          approved_at       TIMESTAMPTZ,
          CHECK (
              (item_id IS NOT NULL AND quantity_delta IS NOT NULL AND vehicle_unit_id IS NULL)
              OR (vehicle_unit_id IS NOT NULL AND item_id IS NULL AND quantity_delta IS NULL)
          )
      );

      CREATE OR REPLACE FUNCTION fn_execute_stock_adjustment()
      RETURNS TRIGGER AS $$
      DECLARE
          v_current_qty NUMERIC(12,2);
      BEGIN
          IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
              IF NEW.item_id IS NOT NULL THEN
                  SELECT quantity_on_hand INTO v_current_qty
                  FROM stock_balance
                  WHERE warehouse_id = NEW.warehouse_id AND item_id = NEW.item_id
                  FOR UPDATE;

                  IF v_current_qty IS NULL THEN
                      RAISE EXCEPTION 'No existing stock balance for item % at warehouse % -- receive stock before adjusting it',
                          NEW.item_id, NEW.warehouse_id;
                  END IF;

                  IF v_current_qty + NEW.quantity_delta < 0 THEN
                      RAISE EXCEPTION 'Adjustment would result in negative stock (have %, delta %) for item % at warehouse %',
                          v_current_qty, NEW.quantity_delta, NEW.item_id, NEW.warehouse_id;
                  END IF;

                  UPDATE stock_balance SET quantity_on_hand = quantity_on_hand + NEW.quantity_delta, updated_at = now()
                  WHERE warehouse_id = NEW.warehouse_id AND item_id = NEW.item_id;
              END IF;

              NEW.approved_at = now();
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_execute_stock_adjustment ON stock_adjustment;
      CREATE TRIGGER trg_execute_stock_adjustment
      BEFORE UPDATE ON stock_adjustment
      FOR EACH ROW EXECUTE FUNCTION fn_execute_stock_adjustment();
    `);

    // =====================================================================
    // 7. UNIFIED STOCK MOVEMENT HISTORY & PRODUCTION RECEIPT
    // =====================================================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS production_receipt (
          production_receipt_id BIGSERIAL PRIMARY KEY,
          item_id                BIGINT NOT NULL REFERENCES product_item(item_id),
          chassis_number         VARCHAR(50) NOT NULL UNIQUE,
          engine_number          VARCHAR(50) NOT NULL UNIQUE,
          warehouse_id           INT NOT NULL REFERENCES warehouse(warehouse_id),
          assembled_at           DATE NOT NULL DEFAULT CURRENT_DATE,
          received_by            INT REFERENCES app_user(user_id),
          created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE FUNCTION fn_create_vehicle_unit_from_production()
      RETURNS TRIGGER AS $$
      BEGIN
          INSERT INTO vehicle_unit (item_id, chassis_number, engine_number, current_warehouse_id, current_status, created_by)
          VALUES (NEW.item_id, NEW.chassis_number, NEW.engine_number, NEW.warehouse_id, 'RECEIVED', NEW.received_by);
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_create_vehicle_unit_from_production ON production_receipt;
      CREATE TRIGGER trg_create_vehicle_unit_from_production
      AFTER INSERT ON production_receipt
      FOR EACH ROW EXECUTE FUNCTION fn_create_vehicle_unit_from_production();

      CREATE OR REPLACE VIEW vw_stock_movement_history AS
      SELECT
          'RECEIPT' AS movement_type, sr.received_at AS movement_at, sr.warehouse_id,
          pol.item_id, NULL::BIGINT AS vehicle_unit_id, sr.quantity_received AS quantity,
          'shipment_receipt' AS reference_table, sr.receipt_id::TEXT AS reference_id, sr.received_by AS performed_by
      FROM shipment_receipt sr
      JOIN shipment_line sl ON sl.shipment_line_id = sr.shipment_line_id
      JOIN purchase_order_line pol ON pol.po_line_id = sl.po_line_id

      UNION ALL

      SELECT
          'TRANSFER_OUT', st.completed_at, st.from_warehouse_id,
          stl.item_id, stl.vehicle_unit_id, -stl.quantity,
          'stock_transfer', st.transfer_id::TEXT, st.approved_by
      FROM stock_transfer st
      JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
      WHERE st.status = 'COMPLETED'

      UNION ALL

      SELECT
          'TRANSFER_IN', st.completed_at, st.to_warehouse_id,
          stl.item_id, stl.vehicle_unit_id, stl.quantity,
          'stock_transfer', st.transfer_id::TEXT, st.approved_by
      FROM stock_transfer st
      JOIN stock_transfer_line stl ON stl.transfer_id = st.transfer_id
      WHERE st.status = 'COMPLETED'

      UNION ALL

      SELECT
          'ADJUSTMENT', sa.approved_at, sa.warehouse_id,
          sa.item_id, sa.vehicle_unit_id, sa.quantity_delta,
          'stock_adjustment', sa.adjustment_id::TEXT, sa.approved_by
      FROM stock_adjustment sa
      WHERE sa.status = 'APPROVED'

      UNION ALL

      SELECT
          'VEHICLE_STATUS_CHANGE', vsh.changed_at, vu.current_warehouse_id,
          NULL::BIGINT, vsh.vehicle_unit_id, NULL::NUMERIC,
          'vehicle_status_history', vsh.status_history_id::TEXT, vsh.triggered_by_user
      FROM vehicle_status_history vsh
      JOIN vehicle_unit vu ON vu.vehicle_unit_id = vsh.vehicle_unit_id;

      CREATE OR REPLACE VIEW vw_current_stock_balance AS
      SELECT w.warehouse_name, pi.item_code, pi.item_name,
             sb.quantity_on_hand, sb.quantity_reserved, sb.quantity_available
      FROM stock_balance sb
      JOIN warehouse w ON w.warehouse_id = sb.warehouse_id
      JOIN product_item pi ON pi.item_id = sb.item_id;

      CREATE OR REPLACE VIEW vw_vehicle_inventory_by_status AS
      SELECT vu.current_status, w.warehouse_name, pi.item_name, COUNT(*) AS unit_count
      FROM vehicle_unit vu
      JOIN warehouse w ON w.warehouse_id = vu.current_warehouse_id
      JOIN product_item pi ON pi.item_id = vu.item_id
      GROUP BY vu.current_status, w.warehouse_name, pi.item_name;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_vehicle_inventory_by_status;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_current_stock_balance;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_stock_movement_history;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_create_vehicle_unit_from_production ON production_receipt;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_create_vehicle_unit_from_production;`);
    await queryRunner.query(`DROP TABLE IF EXISTS production_receipt;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_execute_stock_adjustment ON stock_adjustment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_execute_stock_adjustment;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_adjustment;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS adjustment_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS adjustment_status_enum;`);
    await queryRunner.query(`DROP TYPE IF EXISTS adjustment_reason_enum;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_execute_stock_transfer ON stock_transfer;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_execute_stock_transfer;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_transfer_line;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_transfer;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS transfer_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS transfer_status_enum;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_low_stock_alert;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_increment_stock_on_receipt ON shipment_receipt;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_increment_stock_on_receipt;`);
    await queryRunner.query(`DROP TABLE IF EXISTS stock_balance;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_auto_transition_received_to_available ON vehicle_unit;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_auto_transition_received_to_available;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_status_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_status_transition_rule;`);
    await queryRunner.query(`ALTER TABLE vehicle_unit DROP COLUMN IF EXISTS hold_for_inspection;`);
    await queryRunner.query(`ALTER TABLE product_item DROP COLUMN IF EXISTS is_individually_tracked;`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_warehouse_access;`);
    await queryRunner.query(`ALTER TABLE warehouse DROP COLUMN IF EXISTS contact_phone;`);
    await queryRunner.query(`ALTER TABLE warehouse DROP COLUMN IF EXISTS manager_user_id;`);
    await queryRunner.query(`ALTER TABLE warehouse DROP COLUMN IF EXISTS capacity;`);
    await queryRunner.query(`ALTER TABLE warehouse DROP COLUMN IF EXISTS warehouse_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS warehouse_type_enum;`);
  }
}
