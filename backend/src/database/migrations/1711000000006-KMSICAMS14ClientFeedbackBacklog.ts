import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS14ClientFeedbackBacklog1711000000006 implements MigrationInterface {
  name = 'KMSICAMS14ClientFeedbackBacklog1711000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend enquiry_status_enum with DRAFT and SALES_REP_APPROVED
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TYPE enquiry_status_enum ADD VALUE IF NOT EXISTS 'DRAFT';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TYPE enquiry_status_enum ADD VALUE IF NOT EXISTS 'SALES_REP_APPROVED';
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);

    // 2. Extend customer table (KMSI-14-10)
    await queryRunner.query(`
      ALTER TABLE customer
        ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50) DEFAULT 'PHONE',
        ADD COLUMN IF NOT EXISTS business_occupation VARCHAR(255);
    `);

    // 3. Extend product_item table (KMSI-14-16)
    await queryRunner.query(`
      ALTER TABLE product_item
        ADD COLUMN IF NOT EXISTS model_year INT,
        ADD COLUMN IF NOT EXISTS powertrain VARCHAR(50),
        ADD COLUMN IF NOT EXISTS new_or_used VARCHAR(20) DEFAULT 'NEW',
        ADD COLUMN IF NOT EXISTS fuel_energy_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS driving_range_km INT;
    `);

    // 4. Extend sales_enquiry table (KMSI-14-11, 14-12, 14-13, 14-14, 14-15)
    await queryRunner.query(`
      ALTER TABLE sales_enquiry
        ADD COLUMN IF NOT EXISTS enquiry_date TIMESTAMPTZ DEFAULT now(),
        ADD COLUMN IF NOT EXISTS lead_source VARCHAR(50) DEFAULT 'WALK_IN',
        ADD COLUMN IF NOT EXISTS branch_showroom VARCHAR(150),
        ADD COLUMN IF NOT EXISTS vehicle_category_id SMALLINT,
        ADD COLUMN IF NOT EXISTS preferred_color VARCHAR(50),
        ADD COLUMN IF NOT EXISTS required_delivery_date DATE,
        ADD COLUMN IF NOT EXISTS registration_homologation_needed BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS charger_type_included BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS target_budget NUMERIC(18,2),
        ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETB',
        ADD COLUMN IF NOT EXISTS financing_required BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS expected_deposit NUMERIC(18,2),
        ADD COLUMN IF NOT EXISTS expected_payment_timeline VARCHAR(100),
        ADD COLUMN IF NOT EXISTS finance_provider VARCHAR(150),
        ADD COLUMN IF NOT EXISTS trade_in_vehicle BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS customer_requirements_notes TEXT,
        ADD COLUMN IF NOT EXISTS sales_rep_approved_by INT,
        ADD COLUMN IF NOT EXISTS sales_rep_approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sales_rep_notes TEXT,
        ADD COLUMN IF NOT EXISTS sales_manager_approved_by INT,
        ADD COLUMN IF NOT EXISTS sales_manager_approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS sales_manager_notes TEXT;
    `);

    // 5. Extend booking table (KMSI-14-17)
    await queryRunner.query(`
      ALTER TABLE booking
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'BANK_DEPOSIT';
    `);

    // 6. Extend vehicle_unit for Customer-Owned Retained Stock (KMSI-14-06)
    await queryRunner.query(`
      ALTER TABLE vehicle_unit
        ADD COLUMN IF NOT EXISTS ownership_status VARCHAR(50) DEFAULT 'COMPANY_OWNED',
        ADD COLUMN IF NOT EXISTS custody_customer_id BIGINT,
        ADD COLUMN IF NOT EXISTS custody_reason TEXT,
        ADD COLUMN IF NOT EXISTS custody_start_date DATE,
        ADD COLUMN IF NOT EXISTS expected_handover_date DATE,
        ADD COLUMN IF NOT EXISTS handover_completed_at TIMESTAMPTZ;
    `);

    // 7. Extend spare_parts_sale for Credit Sales Tracking (KMSI-14-07)
    await queryRunner.query(`
      ALTER TABLE spare_parts_sale
        ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(18,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS credit_due_date DATE;
    `);

    // 8. Create customer_payment_transfer table (KMSI-14-05)
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
        transferred_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_cpt_source_booking ON customer_payment_transfer(source_booking_id);
      CREATE INDEX IF NOT EXISTS idx_cpt_dest_booking ON customer_payment_transfer(destination_booking_id);
    `);

    // 9. Create approval_reminder_config and approval_reminder_log (KMSI-14-09)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS approval_reminder_config (
        config_id SERIAL PRIMARY KEY,
        workflow_type_code VARCHAR(50) NOT NULL,
        reminder_interval_hours INT NOT NULL DEFAULT 4,
        is_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS approval_reminder_log (
        reminder_log_id BIGSERIAL PRIMARY KEY,
        approval_request_id BIGINT,
        workflow_type_code VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT NOT NULL,
        reminder_interval_hours INT NOT NULL,
        notification_sent_at TIMESTAMPTZ DEFAULT now(),
        notification_details JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_arl_entity ON approval_reminder_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_arl_sent_at ON approval_reminder_log(notification_sent_at);
    `);

    // 10. Seed default approval reminder configurations
    await queryRunner.query(`
      INSERT INTO approval_reminder_config (workflow_type_code, reminder_interval_hours, is_active)
      VALUES 
        ('SALES_ENQUIRY', 4, true),
        ('ADVANCE_BOOKING', 4, true),
        ('CUSTOMER_REFUND', 8, true),
        ('VEHICLE_DISCOUNT', 2, true)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS approval_reminder_log;`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_reminder_config;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_payment_transfer;`);
  }
}

