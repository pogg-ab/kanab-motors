import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS19CkdSkdImportIntegration1711000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE warehouse
        ADD COLUMN IF NOT EXISTS warehouse_classification VARCHAR(30) NOT NULL DEFAULT 'STANDARD';

      ALTER TABLE shipment
        ADD COLUMN IF NOT EXISTS ckd_skd_classification VARCHAR(20) NOT NULL DEFAULT 'CBU';

      CREATE TABLE IF NOT EXISTS ckd_skd_batch (
        batch_id BIGSERIAL PRIMARY KEY,
        batch_code VARCHAR(100) NOT NULL UNIQUE,
        shipment_id BIGINT NOT NULL REFERENCES shipment(shipment_id),
        shipment_line_id BIGINT REFERENCES shipment_line(shipment_line_id),
        kit_type VARCHAR(10) NOT NULL CHECK (kit_type IN ('CKD', 'SKD')),
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        planned_quantity NUMERIC(18, 3) NOT NULL CHECK (planned_quantity > 0),
        uom_id SMALLINT NOT NULL REFERENCES unit_of_measure(uom_id),
        batch_date DATE,
        remarks TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_ckd_batch_shipment ON ckd_skd_batch(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_ckd_batch_product ON ckd_skd_batch(item_id);

      CREATE TABLE IF NOT EXISTS ckd_skd_batch_receipt (
        batch_receipt_id BIGSERIAL PRIMARY KEY,
        batch_id BIGINT NOT NULL REFERENCES ckd_skd_batch(batch_id) ON DELETE CASCADE,
        receipt_id BIGINT NOT NULL REFERENCES shipment_receipt(receipt_id),
        received_quantity NUMERIC(18, 3) NOT NULL CHECK (received_quantity > 0),
        transferred_to_production_qty NUMERIC(18, 3) NOT NULL DEFAULT 0,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_batch_receipt_line UNIQUE (batch_id, receipt_id),
        CONSTRAINT uq_batch_receipt_id_batch UNIQUE (batch_receipt_id, batch_id)
      );

      CREATE INDEX IF NOT EXISTS idx_batch_receipt_receipt ON ckd_skd_batch_receipt(receipt_id);

      CREATE TABLE IF NOT EXISTS customs_clearance (
        clearance_id BIGSERIAL PRIMARY KEY,
        declaration_number VARCHAR(100) NOT NULL UNIQUE,
        clearance_date DATE,
        status VARCHAR(25) NOT NULL DEFAULT 'DRAFT'
          CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_CLEARED', 'CLEARED', 'ON_HOLD', 'REJECTED', 'CANCELLED')),
        document_reference VARCHAR(500),
        remarks TEXT,
        submitted_at TIMESTAMPTZ,
        approved_at TIMESTAMPTZ,
        approved_by INT REFERENCES app_user(user_id),
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customs_clearance_line (
        clearance_line_id BIGSERIAL PRIMARY KEY,
        clearance_id BIGINT NOT NULL REFERENCES customs_clearance(clearance_id) ON DELETE CASCADE,
        batch_id BIGINT NOT NULL REFERENCES ckd_skd_batch(batch_id),
        batch_receipt_id BIGINT NOT NULL,
        cleared_quantity NUMERIC(18, 3) NOT NULL CHECK (cleared_quantity > 0),
        is_reversed BOOLEAN NOT NULL DEFAULT FALSE,
        reversal_reason TEXT,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_clearance_batch_receipt FOREIGN KEY (batch_receipt_id, batch_id)
          REFERENCES ckd_skd_batch_receipt(batch_receipt_id, batch_id)
      );

      CREATE INDEX IF NOT EXISTS idx_clearance_line_batch ON customs_clearance_line(batch_id);
      CREATE INDEX IF NOT EXISTS idx_clearance_line_receipt ON customs_clearance_line(batch_receipt_id);

      CREATE TABLE IF NOT EXISTS ckd_skd_serial (
        serial_id BIGSERIAL PRIMARY KEY,
        batch_id BIGINT NOT NULL REFERENCES ckd_skd_batch(batch_id),
        batch_receipt_id BIGINT REFERENCES ckd_skd_batch_receipt(batch_receipt_id),
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        vehicle_unit_id BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
        warehouse_id INT REFERENCES warehouse(warehouse_id),
        serial_type VARCHAR(20) NOT NULL CHECK (serial_type IN ('VIN', 'MOTOR', 'ENGINE', 'BATTERY', 'CONTROLLER')),
        serial_number VARCHAR(150) NOT NULL,
        serial_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED'
          CHECK (serial_status IN ('RECEIVED', 'AVAILABLE', 'RESERVED', 'INSTALLED', 'REPLACED', 'REJECTED', 'RETURNED')),
        source_type VARCHAR(30) NOT NULL DEFAULT 'IMPORT'
          CHECK (source_type IN ('IMPORT', 'GOODS_RECEIPT', 'BULK_IMPORT', 'MANUAL')),
        source_reference VARCHAR(150),
        received_at TIMESTAMPTZ,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_ckd_serial_type_number
        ON ckd_skd_serial(serial_type, LOWER(BTRIM(serial_number)));
      CREATE INDEX IF NOT EXISTS idx_ckd_serial_batch ON ckd_skd_serial(batch_id);
      CREATE INDEX IF NOT EXISTS idx_ckd_serial_product ON ckd_skd_serial(item_id);

      CREATE TABLE IF NOT EXISTS bom (
        bom_id BIGSERIAL PRIMARY KEY,
        bom_code VARCHAR(60) NOT NULL UNIQUE,
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        version VARCHAR(20) NOT NULL DEFAULT '1.0',
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        notes TEXT,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS bom_line (
        bom_line_id BIGSERIAL PRIMARY KEY,
        bom_id BIGINT NOT NULL REFERENCES bom(bom_id) ON DELETE CASCADE,
        component_item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        required_quantity NUMERIC(18, 3) NOT NULL CHECK (required_quantity > 0),
        uom_id SMALLINT NOT NULL REFERENCES unit_of_measure(uom_id),
        is_serialized BOOLEAN NOT NULL DEFAULT FALSE,
        serial_type VARCHAR(20)
      );

      CREATE TABLE IF NOT EXISTS integration_event (
        event_id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(80) NOT NULL,
        source_module VARCHAR(50) NOT NULL,
        source_record_id BIGINT NOT NULL,
        target_module VARCHAR(50) NOT NULL,
        idempotency_key VARCHAR(150) NOT NULL UNIQUE,
        payload JSONB,
        processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (processing_status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'RETRY')),
        retry_count INT NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_integration_event_status
        ON integration_event(processing_status, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS integration_event;
      DROP TABLE IF EXISTS bom_line;
      DROP TABLE IF EXISTS bom;
      DROP TABLE IF EXISTS ckd_skd_serial;
      DROP TABLE IF EXISTS customs_clearance_line;
      DROP TABLE IF EXISTS customs_clearance;
      DROP TABLE IF EXISTS ckd_skd_batch_receipt;
      DROP TABLE IF EXISTS ckd_skd_batch;
    `);
  }
}
