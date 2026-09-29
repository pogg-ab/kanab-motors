import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairAuditLogChangedAtInVehicleTransition1710900000000 implements MigrationInterface {
  name = 'RepairAuditLogChangedAtInVehicleTransition1710900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, changed_at)
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
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
              INSERT INTO audit_log (entity_type, entity_id, action, changed_by, old_value, new_value, changed_at)
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
    `);
  }
}
