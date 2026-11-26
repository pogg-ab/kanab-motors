import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompletePhaseFive1711000000013 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE shipment_container ADD COLUMN free_time_start_date DATE,
        ADD COLUMN day_counting VARCHAR(20) NOT NULL DEFAULT 'EXCLUSIVE',
        ADD COLUMN actual_empty_return_date DATE,
        ADD COLUMN deadline_revision INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE shipment ADD COLUMN insurance_required BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE import_notification ADD COLUMN deadline_date DATE,
        ADD COLUMN reminder_date DATE, ADD COLUMN deadline_revision INTEGER;
      CREATE TABLE shipment_logistics_policy (
        policy_id INTEGER PRIMARY KEY CHECK (policy_id=1), settings JSONB NOT NULL DEFAULT '{}');
      INSERT INTO shipment_logistics_policy(policy_id) VALUES(1);
      CREATE TABLE shipment_logistics_history (
        history_id BIGSERIAL PRIMARY KEY,
        shipment_id BIGINT REFERENCES shipment(shipment_id),
        entity_type VARCHAR(50) NOT NULL, entity_id BIGINT NOT NULL,
        changed_by INTEGER REFERENCES app_user(user_id), changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        reason TEXT NOT NULL, old_value JSONB, new_value JSONB NOT NULL);
      CREATE INDEX idx_logistics_history_shipment ON shipment_logistics_history(shipment_id,changed_at);
      CREATE INDEX idx_container_number_normalized ON shipment_container(upper(trim(container_number)));
    `);
    // Uniqueness is enforced under an advisory lock using the configured scope.
    // Preserve legacy records: duplicate numbers or unknown starts are not rewritten.
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE shipment_logistics_history; DROP TABLE shipment_logistics_policy;
      DROP INDEX idx_container_number_normalized;
      ALTER TABLE shipment DROP COLUMN insurance_required;
      ALTER TABLE import_notification DROP COLUMN deadline_date, DROP COLUMN reminder_date, DROP COLUMN deadline_revision;
      ALTER TABLE shipment_container DROP COLUMN free_time_start_date, DROP COLUMN day_counting,
        DROP COLUMN actual_empty_return_date, DROP COLUMN deadline_revision;`);
  }
}
