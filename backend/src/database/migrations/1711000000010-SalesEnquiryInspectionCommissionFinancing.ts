import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesEnquiryInspectionCommissionFinancing1711000000010 implements MigrationInterface {
  name = 'SalesEnquiryInspectionCommissionFinancing1711000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Sequence for inspection numbers
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS inspection_number_seq START WITH 1 INCREMENT BY 1;
    `);

    // 2. Add CANCELLED and EXPIRED to sales_enquiry_status_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_enquiry_status_enum') THEN
          ALTER TYPE sales_enquiry_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
          ALTER TYPE sales_enquiry_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
        END IF;
      END $$;
    `);

    // 3. Add Commission & Financing columns to sales_enquiry
    await queryRunner.query(`
      ALTER TABLE sales_enquiry
        ADD COLUMN IF NOT EXISTS commission_agent_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS commission_agent_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS financing_option VARCHAR(50) DEFAULT 'CASH',
        ADD COLUMN IF NOT EXISTS financing_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS financing_institution_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS financing_contact_person VARCHAR(200),
        ADD COLUMN IF NOT EXISTS financing_contact_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS financing_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS financing_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS customer_contribution_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS customer_contribution_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS financing_status VARCHAR(50) DEFAULT 'NOT_SUBMITTED',
        ADD COLUMN IF NOT EXISTS financing_application_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS financing_submission_date DATE,
        ADD COLUMN IF NOT EXISTS financing_approval_date DATE,
        ADD COLUMN IF NOT EXISTS financing_approved_amount NUMERIC(18, 2),
        ADD COLUMN IF NOT EXISTS financing_disbursed_amount NUMERIC(18, 2),
        ADD COLUMN IF NOT EXISTS financing_disbursement_date DATE,
        ADD COLUMN IF NOT EXISTS financing_notes TEXT;
    `);

    // 4. Add Commission & Financing columns to booking
    await queryRunner.query(`
      ALTER TABLE booking
        ADD COLUMN IF NOT EXISTS commission_agent_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS financing_option VARCHAR(50) DEFAULT 'CASH',
        ADD COLUMN IF NOT EXISTS financing_institution_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS financing_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS customer_contribution_amount NUMERIC(18, 2) DEFAULT 0;
    `);

    // 5. Create customer_vehicle_inspection table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_vehicle_inspection (
        inspection_id BIGSERIAL PRIMARY KEY,
        inspection_number VARCHAR(30) UNIQUE NOT NULL DEFAULT ('INSP-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('inspection_number_seq')::text, 5, '0')),
        enquiry_id BIGINT NOT NULL REFERENCES sales_enquiry(enquiry_id) ON DELETE CASCADE,
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        item_id BIGINT REFERENCES product_item(item_id),
        vehicle_model VARCHAR(200),
        engine_number VARCHAR(100),
        vin_chassis_number VARCHAR(100),
        vehicle_unit_id BIGINT REFERENCES vehicle_unit(unit_id),
        inspection_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        allowed_duration_minutes INT NOT NULL DEFAULT 120,
        inspection_deadline TIMESTAMPTZ,
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        outcome VARCHAR(50),
        inspection_completed_at TIMESTAMPTZ,
        extension_minutes INT NOT NULL DEFAULT 0,
        extension_reason TEXT,
        extended_by INT REFERENCES app_user(user_id),
        cancellation_reason TEXT,
        cancelled_by INT REFERENCES app_user(user_id),
        remarks TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cvi_enquiry ON customer_vehicle_inspection(enquiry_id);
      CREATE INDEX IF NOT EXISTS idx_cvi_status ON customer_vehicle_inspection(status);
      CREATE INDEX IF NOT EXISTS idx_cvi_deadline ON customer_vehicle_inspection(inspection_deadline);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS customer_vehicle_inspection;
      DROP SEQUENCE IF EXISTS inspection_number_seq;
    `);
  }
}
