import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteJiraAcceptanceGaps1711000000008 implements MigrationInterface {
  name = 'CompleteJiraAcceptanceGaps1711000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipment_freight_quotation
        ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS approved_by INT REFERENCES app_user(user_id),
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS freight_quotation_decision_history (
        decision_history_id BIGSERIAL PRIMARY KEY,
        quotation_id BIGINT NOT NULL REFERENCES shipment_freight_quotation(quotation_id) ON DELETE CASCADE,
        shipment_id BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
        decision VARCHAR(20) NOT NULL,
        reason TEXT,
        decided_by INT REFERENCES app_user(user_id),
        decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS shipment_document_requirement (
        requirement_id BIGSERIAL PRIMARY KEY,
        destination_country VARCHAR(100),
        shipment_type VARCHAR(60),
        process_stage VARCHAR(60) NOT NULL,
        document_type VARCHAR(60) NOT NULL,
        is_required BOOLEAN NOT NULL DEFAULT TRUE,
        requires_verification BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(destination_country, shipment_type, process_stage, document_type)
      );

      INSERT INTO shipment_document_requirement(process_stage, document_type, is_required, requires_verification)
      VALUES
        ('ETHIOPIAN_CUSTOMS_CLEARANCE', 'CUSTOMS_DECLARATION', TRUE, TRUE),
        ('RECEIVED', 'CUSTOMS_DECLARATION', TRUE, TRUE),
        ('RECEIVED', 'COMMERCIAL_INVOICE', TRUE, TRUE),
        ('RECEIVED', 'BILL_OF_LADING', TRUE, TRUE)
      ON CONFLICT DO NOTHING;

      CREATE TABLE IF NOT EXISTS import_workflow_transition (
        transition_id BIGSERIAL PRIMARY KEY,
        workflow_type VARCHAR(60) NOT NULL,
        from_status VARCHAR(60) NOT NULL,
        to_status VARCHAR(60) NOT NULL,
        required_permission VARCHAR(100),
        responsible_role VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        UNIQUE(workflow_type, from_status, to_status)
      );
      INSERT INTO import_workflow_transition(workflow_type, from_status, to_status, required_permission, responsible_role)
      VALUES
        ('SHIPMENT','ORDERED','SHIPPED','SHIPMENTS_UPDATE_STAGE','LOGISTICS_OFFICER'),
        ('SHIPMENT','SHIPPED','AT_DJIBOUTI_PORT','SHIPMENTS_UPDATE_STAGE','LOGISTICS_OFFICER'),
        ('SHIPMENT','AT_DJIBOUTI_PORT','ETHIOPIAN_CUSTOMS_CLEARANCE','SHIPMENTS_UPDATE_STAGE','IMPORT_OFFICER'),
        ('SHIPMENT','ETHIOPIAN_CUSTOMS_CLEARANCE','IN_TRANSIT_INLAND','SHIPMENTS_UPDATE_STAGE','LOGISTICS_OFFICER'),
        ('SHIPMENT','IN_TRANSIT_INLAND','RECEIVED','SHIPMENTS_RECEIVE_STOCK','WAREHOUSE_OFFICER'),
        ('FREIGHT_QUOTATION','PENDING','APPROVED','SHIPMENTS_CREATE','LOGISTICS_MANAGER'),
        ('DOCUMENT_VERIFICATION','PENDING','VERIFIED','SHIPMENTS_UPDATE_STAGE','IMPORT_MANAGER')
      ON CONFLICT DO NOTHING;

      ALTER TABLE shipment_document
        ADD COLUMN IF NOT EXISTS version_number INT NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS supersedes_document_id BIGINT REFERENCES shipment_document(shipment_document_id),
        ADD COLUMN IF NOT EXISTS original_dispatched_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS original_received_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS electronic_release_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS release_payment_status VARCHAR(30),
        ADD COLUMN IF NOT EXISTS discrepancy_status VARCHAR(30) NOT NULL DEFAULT 'NOT_CHECKED',
        ADD COLUMN IF NOT EXISTS discrepancy_details JSONB,
        ADD COLUMN IF NOT EXISTS override_reason TEXT;

      ALTER TABLE import_notification
        ADD COLUMN IF NOT EXISTS delivery_channel VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
        ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS escalation_level INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(200);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_import_notification_dedup
        ON import_notification(deduplication_key) WHERE deduplication_key IS NOT NULL;

      CREATE TABLE IF NOT EXISTS import_notification_escalation (
        escalation_id BIGSERIAL PRIMARY KEY,
        notification_id BIGINT NOT NULL REFERENCES import_notification(notification_id) ON DELETE CASCADE,
        escalation_level INT NOT NULL,
        recipient_role VARCHAR(60),
        recipient_user_id INT REFERENCES app_user(user_id),
        delivery_status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED',
        escalated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_company_active_default_bank
        ON company_bank_account(company_profile_id)
        WHERE is_default = TRUE AND is_active = TRUE;

      ALTER TABLE booking
        ADD COLUMN IF NOT EXISTS enquiry_preferences JSONB,
        ADD COLUMN IF NOT EXISTS customer_requirements_notes TEXT;

      ALTER TABLE purchase_order
        ADD COLUMN IF NOT EXISTS supplier_snapshot JSONB,
        ADD COLUMN IF NOT EXISTS company_snapshot JSONB;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_company_active_default_bank;
      DROP TABLE IF EXISTS import_notification_escalation;
      DROP INDEX IF EXISTS uq_import_notification_dedup;
      DROP TABLE IF EXISTS shipment_document_requirement;
      DROP TABLE IF EXISTS import_workflow_transition;
      DROP TABLE IF EXISTS freight_quotation_decision_history;
      ALTER TABLE booking DROP COLUMN IF EXISTS customer_requirements_notes;
      ALTER TABLE booking DROP COLUMN IF EXISTS enquiry_preferences;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS company_snapshot;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS supplier_snapshot;
      ALTER TABLE import_notification DROP COLUMN IF EXISTS deduplication_key;
      ALTER TABLE import_notification DROP COLUMN IF EXISTS escalation_level;
      ALTER TABLE import_notification DROP COLUMN IF EXISTS delivered_at;
      ALTER TABLE import_notification DROP COLUMN IF EXISTS delivery_status;
      ALTER TABLE import_notification DROP COLUMN IF EXISTS delivery_channel;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS override_reason;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS discrepancy_details;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS discrepancy_status;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS release_payment_status;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS electronic_release_at;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS original_received_at;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS original_dispatched_at;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS supersedes_document_id;
      ALTER TABLE shipment_document DROP COLUMN IF EXISTS version_number;
      ALTER TABLE shipment_freight_quotation DROP COLUMN IF EXISTS approved_at;
      ALTER TABLE shipment_freight_quotation DROP COLUMN IF EXISTS approved_by;
      ALTER TABLE shipment_freight_quotation DROP COLUMN IF EXISTS approval_status;
    `);
  }
}
