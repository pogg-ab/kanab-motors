import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS5VehicleAllotment1710300000000 implements MigrationInterface {
  name = 'KMSICAMS5VehicleAllotment1710300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create fn_transition_vehicle_status if not exists
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
          p_vehicle_unit_id BIGINT,
          p_new_status      VARCHAR,
          p_user_id         INT DEFAULT NULL,
          p_action          VARCHAR DEFAULT 'STATUS_TRANSITION',
          p_notes           TEXT DEFAULT NULL
      ) RETURNS void AS $$
      DECLARE
          v_old_status VARCHAR;
      BEGIN
          SELECT current_status INTO v_old_status
          FROM vehicle_unit
          WHERE vehicle_unit_id = p_vehicle_unit_id
          FOR UPDATE;

          IF NOT FOUND THEN
              RAISE EXCEPTION 'Vehicle unit % not found', p_vehicle_unit_id;
          END IF;

          IF v_old_status = p_new_status THEN
              RETURN;
          END IF;

          IF p_new_status = 'ALLOTTED' AND v_old_status NOT IN ('AVAILABLE_FOR_SALE', 'RESERVED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to ALLOTTED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          UPDATE vehicle_unit
          SET current_status = p_new_status::vehicle_status_enum,
              updated_at = now()
          WHERE vehicle_unit_id = p_vehicle_unit_id;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, created_at)
              VALUES (
                  'vehicle_unit',
                  p_vehicle_unit_id,
                  p_action,
                  p_user_id,
                  jsonb_build_object('status', v_old_status),
                  jsonb_build_object('status', p_new_status, 'notes', p_notes),
                  now()
              );
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Create booking_allotment_requirement table & seed from existing bookings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS booking_allotment_requirement (
          booking_id         BIGINT PRIMARY KEY REFERENCES booking(booking_id) ON DELETE CASCADE,
          required_quantity  NUMERIC(12,2) NOT NULL CHECK (required_quantity > 0),
          payment_validated  BOOLEAN NOT NULL DEFAULT FALSE
      );

      INSERT INTO booking_allotment_requirement (booking_id, required_quantity, payment_validated)
      SELECT booking_id, quantity, (booking_status IN ('CONFIRMED', 'SETTLED') OR total_amount_deposited >= required_advance_amount)
      FROM booking
      ON CONFLICT (booking_id) DO UPDATE
      SET required_quantity = EXCLUDED.required_quantity,
          payment_validated = EXCLUDED.payment_validated;
    `);

    // 3. Create allotment_status_enum & allotment_number_seq
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE allotment_status_enum AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS allotment_number_seq START 1;
    `);

    // 4. Create allotment header table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS allotment (
          allotment_id     BIGSERIAL PRIMARY KEY,
          allotment_number VARCHAR(20) NOT NULL UNIQUE
                           DEFAULT ('ALT-' || lpad(nextval('allotment_number_seq')::text, 6, '0')),
          booking_id       BIGINT NOT NULL REFERENCES booking(booking_id),
          status           allotment_status_enum NOT NULL DEFAULT 'REQUESTED',
          requested_by     INT REFERENCES app_user(user_id),
          requested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
          approved_by      INT REFERENCES app_user(user_id),
          approved_at      TIMESTAMPTZ,
          rejection_reason TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_allotment_booking ON allotment(booking_id);
      CREATE INDEX IF NOT EXISTS idx_allotment_status ON allotment(status);
    `);

    // 5. Create allotment_line table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS allotment_line (
          allotment_line_id BIGSERIAL PRIMARY KEY,
          allotment_id       BIGINT NOT NULL REFERENCES allotment(allotment_id) ON DELETE CASCADE,
          vehicle_unit_id    BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id),
          is_active          BOOLEAN NOT NULL DEFAULT TRUE,
          created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          deactivated_at     TIMESTAMPTZ,
          deactivated_by     INT REFERENCES app_user(user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_allotment_line_allotment ON allotment_line(allotment_id);
      CREATE INDEX IF NOT EXISTS idx_allotment_line_vehicle_unit ON allotment_line(vehicle_unit_id);

      CREATE UNIQUE INDEX IF NOT EXISTS uq_allotment_line_active_vehicle
          ON allotment_line(vehicle_unit_id) WHERE is_active;
    `);

    // 6. Over-allotment prevention trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_validate_allotment_quantity()
      RETURNS TRIGGER AS $$
      DECLARE
          v_booking_id       BIGINT;
          v_required         NUMERIC(12,2);
          v_already_allotted INT;
      BEGIN
          SELECT booking_id INTO v_booking_id FROM allotment WHERE allotment_id = NEW.allotment_id;

          SELECT required_quantity INTO v_required
          FROM booking_allotment_requirement
          WHERE booking_id = v_booking_id
          FOR UPDATE;

          IF NOT FOUND THEN
              SELECT quantity INTO v_required FROM booking WHERE booking_id = v_booking_id;
          END IF;

          SELECT COUNT(*) INTO v_already_allotted
          FROM allotment_line al
          JOIN allotment a ON a.allotment_id = al.allotment_id
          WHERE a.booking_id = v_booking_id AND al.is_active;

          IF v_already_allotted + 1 > v_required THEN
              RAISE EXCEPTION
                  'Allotting this vehicle would exceed booking %''s required quantity (already allotted %, required %)',
                  v_booking_id, v_already_allotted, v_required;
          END IF;

          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_validate_allotment_quantity ON allotment_line;
      CREATE TRIGGER trg_validate_allotment_quantity
      BEFORE INSERT ON allotment_line
      FOR EACH ROW EXECUTE FUNCTION fn_validate_allotment_quantity();
    `);

    // 7. Allotment approval execution trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_execute_allotment_approval()
      RETURNS TRIGGER AS $$
      DECLARE
          r RECORD;
          v_payment_validated BOOLEAN;
      BEGIN
          IF NEW.status = 'APPROVED' AND OLD.status <> 'APPROVED' THEN
              SELECT payment_validated INTO v_payment_validated
              FROM booking_allotment_requirement
              WHERE booking_id = NEW.booking_id;

              IF v_payment_validated IS NULL THEN
                  SELECT (booking_status IN ('CONFIRMED', 'SETTLED') OR total_amount_deposited >= required_advance_amount)
                  INTO v_payment_validated
                  FROM booking
                  WHERE booking_id = NEW.booking_id;
              END IF;

              IF NOT COALESCE(v_payment_validated, FALSE) THEN
                  RAISE EXCEPTION
                      'Cannot approve allotment %: booking % has not been marked payment-validated',
                      NEW.allotment_number, NEW.booking_id;
              END IF;

              FOR r IN
                  SELECT vehicle_unit_id FROM allotment_line
                  WHERE allotment_id = NEW.allotment_id AND is_active
              LOOP
                  PERFORM fn_transition_vehicle_status(
                      r.vehicle_unit_id, 'ALLOTTED', NEW.approved_by, 'ALLOTMENT',
                      'Allotment ' || NEW.allotment_number
                  );
              END LOOP;

              NEW.approved_at = now();
          END IF;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_execute_allotment_approval ON allotment;
      CREATE TRIGGER trg_execute_allotment_approval
      BEFORE UPDATE ON allotment
      FOR EACH ROW EXECUTE FUNCTION fn_execute_allotment_approval();
    `);

    // 8. Reversal / un-allotment callable function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_reverse_allotment(
          p_allotment_id BIGINT,
          p_reversed_by  INT
      ) RETURNS void AS $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN
              SELECT vehicle_unit_id FROM allotment_line
              WHERE allotment_id = p_allotment_id AND is_active
          LOOP
              PERFORM fn_transition_vehicle_status(
                  r.vehicle_unit_id, 'AVAILABLE_FOR_SALE', p_reversed_by, 'ALLOTMENT_REVERSAL',
                  'Reversal of allotment ' || p_allotment_id
              );

              UPDATE allotment_line
              SET is_active = FALSE, deactivated_at = now(), deactivated_by = p_reversed_by
              WHERE allotment_id = p_allotment_id AND vehicle_unit_id = r.vehicle_unit_id;
          END LOOP;

          UPDATE allotment SET status = 'CANCELLED' WHERE allotment_id = p_allotment_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 9. Views
    await queryRunner.query(`
      CREATE OR REPLACE VIEW vw_available_vehicle_units_for_allotment AS
      SELECT vehicle_unit_id, item_id, chassis_number, engine_number, current_warehouse_id, current_status
      FROM vehicle_unit
      WHERE current_status IN ('AVAILABLE_FOR_SALE', 'RESERVED');

      CREATE OR REPLACE VIEW vw_allotment_progress AS
      SELECT
          b.booking_id,
          b.booking_number,
          b.quantity AS required_quantity,
          (b.booking_status IN ('CONFIRMED', 'SETTLED') OR b.total_amount_deposited >= b.required_advance_amount) AS payment_validated,
          COALESCE(SUM(CASE WHEN al.is_active AND a.status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS quantity_allotted,
          b.quantity - COALESCE(SUM(CASE WHEN al.is_active AND a.status = 'APPROVED' THEN 1 ELSE 0 END), 0) AS quantity_remaining
      FROM booking b
      LEFT JOIN allotment a ON a.booking_id = b.booking_id
      LEFT JOIN allotment_line al ON al.allotment_id = a.allotment_id
      GROUP BY b.booking_id, b.booking_number, b.quantity, b.booking_status, b.total_amount_deposited, b.required_advance_amount;

      CREATE OR REPLACE VIEW vw_allotment_history AS
      SELECT
          a.allotment_number, a.booking_id, al.vehicle_unit_id,
          vu.chassis_number, vu.engine_number, al.is_active,
          al.created_at AS allotted_at, al.deactivated_at,
          a.approved_by, a.approved_at
      FROM allotment_line al
      JOIN allotment a ON a.allotment_id = al.allotment_id
      JOIN vehicle_unit vu ON vu.vehicle_unit_id = al.vehicle_unit_id;

      CREATE OR REPLACE VIEW vw_pending_allotments AS
      SELECT
          allotment_id, allotment_number, booking_id, requested_by, requested_at,
          ROUND(EXTRACT(EPOCH FROM (now() - requested_at)) / 3600.0, 1) AS hours_pending
      FROM allotment
      WHERE status = 'REQUESTED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS vw_pending_allotments;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_allotment_history;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_allotment_progress;`);
    await queryRunner.query(`DROP VIEW IF EXISTS vw_available_vehicle_units_for_allotment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_reverse_allotment;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_execute_allotment_approval ON allotment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_execute_allotment_approval;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_validate_allotment_quantity ON allotment_line;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_validate_allotment_quantity;`);
    await queryRunner.query(`DROP TABLE IF EXISTS allotment_line;`);
    await queryRunner.query(`DROP TABLE IF EXISTS allotment;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS allotment_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS allotment_status_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking_allotment_requirement;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_transition_vehicle_status;`);
  }
}
