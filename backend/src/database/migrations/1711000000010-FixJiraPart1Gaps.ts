import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixJiraPart1Gaps1711000000010 implements MigrationInterface {
  name = 'FixJiraPart1Gaps1711000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend PO Payment Schedule with percentage & calculation base (IMP-16, IMP-17)
    await queryRunner.query(`
      ALTER TABLE po_payment_schedule
        ADD COLUMN IF NOT EXISTS payment_percentage NUMERIC(5,2),
        ADD COLUMN IF NOT EXISTS po_amount_base NUMERIC(18,2);
    `);

    // 2. Extend Purchase Order with Incoterm named place, lead time day type, bank snapshot (IMP-07, POX-03, POX-08)
    await queryRunner.query(`
      ALTER TABLE purchase_order
        ADD COLUMN IF NOT EXISTS incoterms_named_place VARCHAR(150),
        ADD COLUMN IF NOT EXISTS lead_time_day_type VARCHAR(20) DEFAULT 'CALENDAR',
        ADD COLUMN IF NOT EXISTS bank_snapshot JSONB;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_purchase_order_requisition_id
        ON purchase_order(requisition_id)
        WHERE requisition_id IS NOT NULL;
    `);

    // 3. Extend Import Requisition Line with planning fields (IMP-05)
    await queryRunner.query(`
      ALTER TABLE import_requisition_line
        ADD COLUMN IF NOT EXISTS supplier_moq NUMERIC(12,2),
        ADD COLUMN IF NOT EXISTS planning_lead_time_days INT,
        ADD COLUMN IF NOT EXISTS demand_rationale TEXT;
    `);

    // 4. Extend Compliance Record with renewal tracking (IMP-14)
    await queryRunner.query(`
      ALTER TABLE import_compliance_record
        ADD COLUMN IF NOT EXISTS renewal_of_id BIGINT REFERENCES import_compliance_record(compliance_record_id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_compliance_renewal ON import_compliance_record(renewal_of_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_compliance_renewal;
      ALTER TABLE import_compliance_record DROP COLUMN IF EXISTS renewal_of_id;

      ALTER TABLE import_requisition_line
        DROP COLUMN IF EXISTS demand_rationale,
        DROP COLUMN IF EXISTS planning_lead_time_days,
        DROP COLUMN IF EXISTS supplier_moq;

      DROP INDEX IF EXISTS uq_purchase_order_requisition_id;
      ALTER TABLE purchase_order
        DROP COLUMN IF EXISTS bank_snapshot,
        DROP COLUMN IF EXISTS lead_time_day_type,
        DROP COLUMN IF EXISTS incoterms_named_place;

      ALTER TABLE po_payment_schedule
        DROP COLUMN IF EXISTS po_amount_base,
        DROP COLUMN IF EXISTS payment_percentage;
    `);
  }
}
