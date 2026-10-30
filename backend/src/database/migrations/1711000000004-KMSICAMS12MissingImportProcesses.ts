import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS12MissingImportProcesses1711000000004 implements MigrationInterface {
  name = 'KMSICAMS12MissingImportProcesses1711000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // -------------------------------------------------------------
    // 1. Company Importer Profile & Bank Accounts (POX-01, POX-03)
    // -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_profile (
        profile_id SERIAL PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        iec_no VARCHAR(50),
        ad_code VARCHAR(50),
        tax_id VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Ethiopia',
        phone VARCHAR(50),
        email VARCHAR(150),
        is_default BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO company_profile (company_name, iec_no, ad_code, tax_id, address, city, country, phone, email, is_default)
      VALUES (
        'KANAB Motors PLC',
        'ETH-IEC-994821',
        'AD-CBE-0019284',
        'TIN-0092837461',
        'Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia',
        'Addis Ababa',
        'Ethiopia',
        '+251 11 662 4890',
        'import@kanabmotors.com',
        TRUE
      )
      ON CONFLICT DO NOTHING;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_bank_account (
        bank_account_id SERIAL PRIMARY KEY,
        account_name VARCHAR(150) NOT NULL,
        bank_name VARCHAR(150) NOT NULL,
        account_number VARCHAR(60) NOT NULL,
        bank_branch VARCHAR(100),
        ifsc_code VARCHAR(50),
        swift_code VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'USD',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO company_bank_account (account_name, bank_name, account_number, bank_branch, ifsc_code, swift_code, currency, is_active)
      VALUES 
        ('KANAB MOTORS PLC - USD FOREX', 'Commercial Bank of Ethiopia', '100029384756', 'Finfinne Main Branch', 'CBETETAA', 'CBETETAA', 'USD', TRUE),
        ('KANAB MOTORS PLC - EUR FOREX', 'Dashen Bank SC', '528394857201', 'Bole Medhanealem Branch', 'DASHETAA', 'DASHETAA', 'EUR', TRUE),
        ('KANAB MOTORS PLC - MAIN ETB', 'Awash International Bank', '01320495867300', 'Africa Avenue Branch', 'AWINETAA', 'AWINETAA', 'ETB', TRUE)
      ON CONFLICT DO NOTHING;
    `);

    // -------------------------------------------------------------
    // 2. Extend Supplier Master with Exporter Codes (POX-02)
    // -------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE supplier ADD COLUMN IF NOT EXISTS exporter_iec_no VARCHAR(50);
      ALTER TABLE supplier ADD COLUMN IF NOT EXISTS exporter_ad_code VARCHAR(50);
    `);

    // -------------------------------------------------------------
    // 3. Phase 1: Import Requisition and Line Items (IMP-01 to IMP-06)
    // -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE import_requisition_status_enum AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'CANCELLED',
        'CONVERTED_TO_PO'
      );
    `);

    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS import_requisition_number_seq START 1;

      CREATE TABLE IF NOT EXISTS import_requisition (
        requisition_id BIGSERIAL PRIMARY KEY,
        requisition_number VARCHAR(30) NOT NULL UNIQUE
                           DEFAULT ('REQ-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('import_requisition_number_seq')::text, 5, '0')),
        business_unit_id VARCHAR(100) NOT NULL DEFAULT 'Fleet & Commercial Vehicle Assembly',
        requested_by INT REFERENCES app_user(user_id),
        request_date DATE NOT NULL DEFAULT CURRENT_DATE,
        required_delivery_date DATE,
        justification TEXT,
        estimated_budget NUMERIC(18,2) DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status import_requisition_status_enum NOT NULL DEFAULT 'DRAFT',
        approved_by INT REFERENCES app_user(user_id),
        approved_at TIMESTAMPTZ,
        approval_notes TEXT,
        rejection_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_import_requisition_status ON import_requisition(status);
      CREATE INDEX IF NOT EXISTS idx_import_requisition_req_by ON import_requisition(requested_by);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_requisition_line (
        requisition_line_id BIGSERIAL PRIMARY KEY,
        requisition_id BIGINT NOT NULL REFERENCES import_requisition(requisition_id) ON DELETE CASCADE,
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        quantity_requested NUMERIC(12,2) NOT NULL,
        estimated_unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        line_total NUMERIC(18,2) GENERATED ALWAYS AS (quantity_requested * estimated_unit_price) STORED,
        technical_specification TEXT,
        quality_requirements TEXT,
        intended_application TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_imp_req_line_req ON import_requisition_line(requisition_id);
      CREATE INDEX IF NOT EXISTS idx_imp_req_line_item ON import_requisition_line(item_id);
    `);

    // -------------------------------------------------------------
    // 4. Phase 2: Extend Purchase Order with Commercial Terms (IMP-07 to IMP-11, POX-04, POX-08)
    // -------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS requisition_id BIGINT REFERENCES import_requisition(requisition_id);
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS incoterms VARCHAR(30) DEFAULT 'FOB';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT '30% Advance T/T, 70% against Bill of Lading';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100) DEFAULT 'India';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS port_of_loading VARCHAR(100) DEFAULT 'Nhava Sheva (JNPT), Mumbai, India';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS port_of_discharge VARCHAR(100) DEFAULT 'Djibouti Free Port / Mojo Dry Port';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS mode_of_shipment VARCHAR(50) DEFAULT 'SEA';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS packing_requirements VARCHAR(200) DEFAULT 'Standard export seaworthy packing in heavy-duty 40ft High Cube containers';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS delivery_lead_time_days INT DEFAULT 30;
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS lead_time_trigger VARCHAR(100) DEFAULT 'PO issuance and confirmed advance payment';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS proforma_invoice_no VARCHAR(100);
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS proforma_invoice_date DATE;
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS contract_reference VARCHAR(100);
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS inspection_requirements TEXT DEFAULT 'Pre-shipment inspection (PSI) by approved international surveyor (SGS/Bureau Veritas)';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS warranty_terms TEXT DEFAULT '12 months or 20,000 km manufacturer warranty from date of handover';
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS commercial_remarks TEXT;
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS bank_account_id INT REFERENCES company_bank_account(bank_account_id);
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS amount_in_words TEXT;

      -- Lines extensions: HSN/SAC, UOM, and description snapshot
      ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS hsn_sac_code VARCHAR(50) DEFAULT '8711.20';
      ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS uom VARCHAR(20) DEFAULT 'PCS';
      ALTER TABLE purchase_order_line ADD COLUMN IF NOT EXISTS item_description TEXT;
    `);

    // -------------------------------------------------------------
    // 5. Phase 3: Import Registration and Regulatory Compliance (IMP-12 to IMP-15)
    // -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS import_compliance_record (
        compliance_record_id BIGSERIAL PRIMARY KEY,
        po_id BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
        shipment_id BIGINT REFERENCES shipment(shipment_id),
        requirement_type VARCHAR(100) NOT NULL,
        issuing_authority VARCHAR(200) NOT NULL,
        application_reference VARCHAR(100),
        document_reference VARCHAR(100),
        application_date DATE,
        submission_date DATE,
        issue_date DATE,
        expiry_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        notes TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_compliance_po ON import_compliance_record(po_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_shipment ON import_compliance_record(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_status ON import_compliance_record(status);
    `);

    // -------------------------------------------------------------
    // 6. Phase 4: Payment Schedule, Transactions & Letter of Credit (IMP-16 to IMP-22)
    // -------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS po_payment_schedule (
        payment_schedule_id BIGSERIAL PRIMARY KEY,
        po_id BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
        milestone_name VARCHAR(100) NOT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'TELEGRAPHIC_TRANSFER',
        due_date DATE,
        amount_due NUMERIC(18,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
        notes TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_po_pay_sched_po ON po_payment_schedule(po_id);
      CREATE INDEX IF NOT EXISTS idx_po_pay_sched_status ON po_payment_schedule(status);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS po_payment_transaction (
        payment_transaction_id BIGSERIAL PRIMARY KEY,
        payment_schedule_id BIGINT NOT NULL REFERENCES po_payment_schedule(payment_schedule_id) ON DELETE CASCADE,
        payment_reference VARCHAR(100) NOT NULL,
        payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount_paid NUMERIC(18,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        bank_name VARCHAR(150),
        status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED',
        notes TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_po_pay_txn_sched ON po_payment_transaction(payment_schedule_id);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS po_letter_of_credit (
        lc_id BIGSERIAL PRIMARY KEY,
        po_id BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
        lc_number VARCHAR(100) NOT NULL UNIQUE,
        issuing_bank VARCHAR(150) NOT NULL,
        advising_bank VARCHAR(150),
        amount NUMERIC(18,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        issue_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        latest_shipment_date DATE,
        status VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
        documentary_requirements TEXT,
        notes TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_po_lc_po ON po_letter_of_credit(po_id);
      CREATE INDEX IF NOT EXISTS idx_po_lc_status ON po_letter_of_credit(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS po_letter_of_credit;`);
    await queryRunner.query(`DROP TABLE IF EXISTS po_payment_transaction;`);
    await queryRunner.query(`DROP TABLE IF EXISTS po_payment_schedule;`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_compliance_record;`);

    await queryRunner.query(`
      ALTER TABLE purchase_order_line DROP COLUMN IF EXISTS item_description;
      ALTER TABLE purchase_order_line DROP COLUMN IF EXISTS uom;
      ALTER TABLE purchase_order_line DROP COLUMN IF EXISTS hsn_sac_code;

      ALTER TABLE purchase_order DROP COLUMN IF EXISTS amount_in_words;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS bank_account_id;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS commercial_remarks;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS warranty_terms;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS inspection_requirements;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS contract_reference;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS proforma_invoice_date;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS proforma_invoice_no;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS expected_delivery_date;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS lead_time_trigger;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS delivery_lead_time_days;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS packing_requirements;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS mode_of_shipment;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS port_of_discharge;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS port_of_loading;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS country_of_origin;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS payment_terms;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS incoterms;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS requisition_id;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS import_requisition_line;`);
    await queryRunner.query(`DROP TABLE IF EXISTS import_requisition;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS import_requisition_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS import_requisition_status_enum;`);

    await queryRunner.query(`
      ALTER TABLE supplier DROP COLUMN IF EXISTS exporter_ad_code;
      ALTER TABLE supplier DROP COLUMN IF EXISTS exporter_iec_no;
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS company_bank_account;`);
    await queryRunner.query(`DROP TABLE IF EXISTS company_profile;`);
  }
}

