import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairAuditLogChangedAtInVehicleTransitionVarchar1710910000000 implements MigrationInterface {
  name = 'RepairAuditLogChangedAtInVehicleTransitionVarchar1710910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
          p_vehicle_unit_id BIGINT,
          p_new_status VARCHAR,
          p_user_id INT DEFAULT NULL,
          p_action VARCHAR DEFAULT 'STATUS_TRANSITION',
          p_notes TEXT DEFAULT NULL
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

          IF p_new_status = 'AVAILABLE_FOR_SALE' AND v_old_status NOT IN ('RECEIVED', 'RESERVED', 'ALLOTTED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to AVAILABLE_FOR_SALE from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'RESERVED' AND v_old_status NOT IN ('AVAILABLE_FOR_SALE') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to RESERVED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'ALLOTTED' AND v_old_status NOT IN ('AVAILABLE_FOR_SALE', 'RESERVED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to ALLOTTED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'READY_FOR_DELIVERY' AND v_old_status NOT IN ('ALLOTTED', 'AVAILABLE_FOR_SALE') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to READY_FOR_DELIVERY from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'SOLD' AND v_old_status NOT IN ('READY_FOR_DELIVERY', 'ALLOTTED') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to SOLD from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          IF p_new_status = 'DELIVERED' AND v_old_status NOT IN ('SOLD', 'READY_FOR_DELIVERY') THEN
              RAISE EXCEPTION 'Cannot transition vehicle % to DELIVERED from status %', p_vehicle_unit_id, v_old_status;
          END IF;

          UPDATE vehicle_unit
          SET current_status = p_new_status::vehicle_status_enum,
              updated_at = now()
          WHERE vehicle_unit_id = p_vehicle_unit_id;

          INSERT INTO vehicle_status_history
              (vehicle_unit_id, from_status, to_status, triggered_by_user, triggered_by_module, notes)
          VALUES
              (p_vehicle_unit_id, v_old_status::vehicle_status_enum, p_new_status::vehicle_status_enum, p_user_id, p_action, p_notes);

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, changed_at)
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_transition_vehicle_status(
          p_vehicle_unit_id BIGINT,
          p_new_status VARCHAR,
          p_user_id INT DEFAULT NULL,
          p_action VARCHAR DEFAULT 'STATUS_TRANSITION',
          p_notes TEXT DEFAULT NULL
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

          UPDATE vehicle_unit
          SET current_status = p_new_status::vehicle_status_enum,
              updated_at = now()
          WHERE vehicle_unit_id = p_vehicle_unit_id;

          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_log') THEN
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, changed_at)
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
  }
}
