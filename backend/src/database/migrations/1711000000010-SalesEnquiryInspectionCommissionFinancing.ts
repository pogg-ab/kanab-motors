import { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesEnquiryInspectionCommissionFinancing1711000000010 implements MigrationInterface {
  name = 'SalesEnquiryInspectionCommissionFinancing1711000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Sequence for inspection numbers
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS inspection_number_seq START WITH 1 INCREMENT BY 1;
    `);

    // 2. Add CANCELLED and EXPIRED to enquiry_status_enum and sales_enquiry_status_enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enquiry_status_enum') THEN
          ALTER TYPE enquiry_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
          ALTER TYPE enquiry_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sales_enquiry_status_enum') THEN
          ALTER TYPE sales_enquiry_status_enum ADD VALUE IF NOT EXISTS 'CANCELLED';
          ALTER TYPE sales_enquiry_status_enum ADD VALUE IF NOT EXISTS 'EXPIRED';
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 3. Ensure vehicle_unit custody and insurance columns exist
    await queryRunner.query(`
      ALTER TABLE vehicle_unit
        ADD COLUMN IF NOT EXISTS ownership_status VARCHAR(50) DEFAULT 'COMPANY_OWNED',
        ADD COLUMN IF NOT EXISTS custody_customer_id BIGINT,
        ADD COLUMN IF NOT EXISTS custody_reason TEXT,
        ADD COLUMN IF NOT EXISTS custody_start_date DATE,
        ADD COLUMN IF NOT EXISTS expected_handover_date DATE,
        ADD COLUMN IF NOT EXISTS insurance_responsibility VARCHAR(100),
        ADD COLUMN IF NOT EXISTS storage_location_notes TEXT,
        ADD COLUMN IF NOT EXISTS handover_completed_at TIMESTAMPTZ;
    `);

    // 4. Add Commission & Financing columns to sales_enquiry
    await queryRunner.query(`
      ALTER TABLE sales_enquiry
        ADD COLUMN IF NOT EXISTS commission_agent_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS commission_agent_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_notes TEXT,
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
        ADD COLUMN IF NOT EXISTS commission_agent_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_notes TEXT,
        ADD COLUMN IF NOT EXISTS financing_option VARCHAR(50) DEFAULT 'CASH',
        ADD COLUMN IF NOT EXISTS financing_institution_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS financing_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS customer_contribution_amount NUMERIC(18, 2) DEFAULT 0;
    `);

    // 5. Create customer_vehicle_inspection table with vehicle_unit(vehicle_unit_id) FK
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
        vehicle_unit_id BIGINT REFERENCES vehicle_unit(vehicle_unit_id),
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

    // 7. Ensure customer_payment_transfer columns and table exist (KMS-FB-05 / KMSI-14-05)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_payment_transfer (
        transfer_id BIGSERIAL PRIMARY KEY,
        source_booking_id BIGINT NOT NULL REFERENCES booking(booking_id),
        source_customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        destination_booking_id BIGINT NOT NULL REFERENCES booking(booking_id),
        destination_customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        transfer_amount NUMERIC(18,2) NOT NULL,
        transfer_reason TEXT NOT NULL,
        authorization_reference VARCHAR(150),
        transferred_by INT,
        status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
        approved_by INT,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        transferred_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_cpt_source_booking ON customer_payment_transfer(source_booking_id);
      CREATE INDEX IF NOT EXISTS idx_cpt_dest_booking ON customer_payment_transfer(destination_booking_id);

      ALTER TABLE customer_payment_transfer
        ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'PENDING_APPROVAL',
        ADD COLUMN IF NOT EXISTS approved_by INT,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS customer_vehicle_inspection;
      DROP SEQUENCE IF EXISTS inspection_number_seq;
    `);
  }
}
