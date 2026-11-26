import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
import { ShipmentsService } from './modules/shipments/services/shipments.service';
import { ApprovalsService } from './modules/approvals/approvals.service';
import { EnquiriesService } from './modules/enquiries/enquiries.service';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import { seedDatabase } from './database/seed';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function ensureSequences() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'kanab_motors',
  });

  try {
    await client.connect();
    const sequences = [
      'customer_code_seq',
      'enquiry_number_seq',
      'booking_number_seq',
      'receipt_number_seq',
      'refund_number_seq',
      'po_number_seq',
      'shipment_number_seq',
      'pre_advance_slip_seq',
      'inspection_number_seq',
    ];
    for (const seq of sequences) {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS ${seq} START 1;`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS typeorm_metadata (
        type VARCHAR,
        database VARCHAR,
        schema VARCHAR,
        "table" VARCHAR,
        name VARCHAR,
        value TEXT
      );
      ALTER TABLE shipment_receipt ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS hold_for_inspection BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS shipment_line_id BIGINT;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS ownership_status VARCHAR(50) DEFAULT 'COMPANY_OWNED';
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS custody_customer_id BIGINT;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS custody_reason TEXT;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS custody_start_date DATE;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS expected_handover_date DATE;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS insurance_responsibility VARCHAR(100);
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS storage_location_notes TEXT;
      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS handover_completed_at TIMESTAMPTZ;
      ALTER TABLE audit_log ALTER COLUMN action TYPE VARCHAR(100);
      ALTER TABLE customer ADD COLUMN IF NOT EXISTS withholding_tax_flag BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS usage_type VARCHAR(30) DEFAULT 'BOTH';
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS colour VARCHAR(50);
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS engine_capacity_cc VARCHAR(50);
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS battery_power_kwh NUMERIC(6, 2);
      CREATE TABLE IF NOT EXISTS vehicle_color (
        color_id SERIAL PRIMARY KEY,
        color_name VARCHAR(50) NOT NULL UNIQUE,
        hex_code VARCHAR(20) DEFAULT '#000000',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      INSERT INTO vehicle_color (color_name, hex_code) VALUES
        ('Jet Black', '#111827'),
        ('Crimson Red', '#DC2626'),
        ('Royal Blue', '#2563EB'),
        ('Pearl White', '#F9FAFB'),
        ('Metallic Silver', '#9CA3AF'),
        ('Golden Yellow', '#F59E0B'),
        ('Emerald Green', '#10B981')
      ON CONFLICT (color_name) DO NOTHING;
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'VAT';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS applicable_customer_type VARCHAR(30) DEFAULT 'ALL';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS applicable_vehicle_type VARCHAR(50) DEFAULT 'ALL';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS calculation_base VARCHAR(50) DEFAULT 'VEHICLE_PRICE';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS priority INT DEFAULT 1;
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS effective_from DATE DEFAULT '2026-01-01';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS effective_to DATE;
      CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_configuration_tax_name ON tax_configuration (tax_name);
      INSERT INTO tax_configuration (tax_name, tax_rate_pct, is_active, tax_type, applicable_customer_type, applicable_vehicle_type, calculation_base, priority, effective_from, description)
      VALUES
        ('Standard Ethiopian VAT', 15.00, true, 'VAT', 'ALL', 'ALL', 'VEHICLE_PRICE', 1, '2026-01-01', 'Standard 15% statutory Ethiopian Value Added Tax (VAT)'),
        ('Standard Commercial WHT', 2.00, true, 'WHT', 'ALL', 'ALL', 'VEHICLE_PRICE', 1, '2026-01-01', 'Standard 2% Commercial Withholding Tax deducted at source'),
        ('Automotive Excise Duty Tier 1', 10.00, true, 'EXCISE', 'ALL', 'THREE_WHEELER', 'VEHICLE_PRICE', 1, '2026-01-01', 'Automotive statutory excise duty tier for three-wheelers and commercial units'),
        ('Zero-Rated Tax Tier', 0.00, true, 'VAT', 'ALL', 'ALL', 'VEHICLE_PRICE', 1, '2026-01-01', 'Zero-rated VAT tier for qualifying exempt transactions and diplomatic sales')
      ON CONFLICT (tax_name) DO NOTHING;
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_receipt_source_enum') THEN
          ALTER TYPE stock_receipt_source_enum ADD VALUE IF NOT EXISTS 'IMPORT_CONTAINER';
        END IF;
      END $$;
      INSERT INTO vehicle_status_transition_rule (from_status, to_status)
      VALUES ('RECEIVED', 'AVAILABLE_FOR_SALE')
      ON CONFLICT DO NOTHING;

      -- Story E16, E17, E18: Pre-Advance Slip table
      CREATE TABLE IF NOT EXISTS pre_advance_slip (
        slip_id BIGSERIAL PRIMARY KEY,
        slip_number VARCHAR(30) UNIQUE NOT NULL DEFAULT ('PAS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('pre_advance_slip_seq')::text, 5, '0')),
        enquiry_id BIGINT NOT NULL,
        customer_id BIGINT NOT NULL,
        item_id BIGINT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price NUMERIC(18, 2) NOT NULL,
        vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        total_amount NUMERIC(18, 2) NOT NULL,
        required_advance_amount NUMERIC(18, 2) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
        notes TEXT,
        created_by INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_slip_enquiry ON pre_advance_slip(enquiry_id);
      CREATE INDEX IF NOT EXISTS idx_slip_customer ON pre_advance_slip(customer_id);
      CREATE INDEX IF NOT EXISTS idx_slip_status ON pre_advance_slip(status);

      -- Story B3: Booking slip linkage
      ALTER TABLE booking ADD COLUMN IF NOT EXISTS slip_id BIGINT;

      -- Story P14: Customer Payment Installment CEO Approval Gate
      ALTER TABLE customer_payment ADD COLUMN IF NOT EXISTS is_installment BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE customer_payment ADD COLUMN IF NOT EXISTS installment_approval_status VARCHAR(30) DEFAULT 'NONE';
      ALTER TABLE customer_payment ADD COLUMN IF NOT EXISTS ceo_approved_by INT;
      ALTER TABLE customer_payment ADD COLUMN IF NOT EXISTS ceo_approved_at TIMESTAMPTZ;
      ALTER TABLE customer_payment ADD COLUMN IF NOT EXISTS ceo_rejection_reason TEXT;

      -- Story P15: Customer Payment Transfer table & Approval Workflow (KMS-FB-05 / KMSI-14-05)
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

      -- Story X9: Credit transfer ledger transaction type support
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ledger_transaction_type_enum') THEN
          BEGIN
            ALTER TYPE ledger_transaction_type_enum ADD VALUE IF NOT EXISTS 'CREDIT_TRANSFER';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TYPE ledger_transaction_type_enum ADD VALUE IF NOT EXISTS 'WHT_SETTLEMENT';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_ledger_transaction_transaction_type_enum') THEN
          BEGIN
            ALTER TYPE customer_ledger_transaction_transaction_type_enum ADD VALUE IF NOT EXISTS 'CREDIT_TRANSFER';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
          BEGIN
            ALTER TYPE customer_ledger_transaction_transaction_type_enum ADD VALUE IF NOT EXISTS 'WHT_SETTLEMENT';
          EXCEPTION WHEN OTHERS THEN NULL;
          END;
        END IF;
      END $$;

      -- Story IV1 & IV2: Sales Invoice Data Model & Tax Engine Enhancements
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE sales_invoice ALTER COLUMN gross_total DROP EXPRESSION;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE sales_invoice ALTER COLUMN outstanding_balance DROP EXPRESSION;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;

      -- Story IV14 & IV1 & IV2: Taxes (VAT, Excise, WHT) and Audit Details
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS excise_tax_rate NUMERIC(5, 4) DEFAULT 0;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS excise_tax_amount NUMERIC(18, 2) DEFAULT 0;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(18, 2) DEFAULT 0;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS net_payable NUMERIC(18, 2) DEFAULT 0;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS tax_details JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS tax_override_reason TEXT;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS tax_override_by INT;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_applicable BOOLEAN DEFAULT FALSE;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_rate NUMERIC(5, 4) DEFAULT 0.02;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_amount NUMERIC(18, 2) DEFAULT 0;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_certificate_number VARCHAR(100);
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_certificate_date DATE;
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_status VARCHAR(30) DEFAULT 'NONE';
      ALTER TABLE sales_invoice ADD COLUMN IF NOT EXISTS wht_settled_at TIMESTAMPTZ;

      -- Story DL5: Delivery Handover pack and customer declaration
      ALTER TABLE delivery ADD COLUMN IF NOT EXISTS handover_pack_items JSONB DEFAULT '{"keys": 2, "spare_wheel": true, "tool_kit": true, "manual": true, "warranty_booklet": true, "transit_permit": true}'::jsonb;
      ALTER TABLE delivery ADD COLUMN IF NOT EXISTS customer_declaration_text TEXT;
      ALTER TABLE delivery ADD COLUMN IF NOT EXISTS odometer_reading INT DEFAULT 0;

      -- Client Demo Feedback: KMSICAMS-2 (Commission Agent, Inspection Countdown Governance, Financing)
      CREATE SEQUENCE IF NOT EXISTS inspection_number_seq START WITH 1 INCREMENT BY 1;

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

      ALTER TABLE sales_enquiry
        ADD COLUMN IF NOT EXISTS commission_agent_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS commission_agent_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_notes TEXT,
        ADD COLUMN IF NOT EXISTS commission_payment_status VARCHAR(50) DEFAULT 'UNPAID',
        ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS commission_paid_reference VARCHAR(100),
        ADD COLUMN IF NOT EXISTS commission_paid_notes TEXT,
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

      ALTER TABLE booking
        ADD COLUMN IF NOT EXISTS commission_agent_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS commission_agent_phone VARCHAR(50),
        ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2),
        ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS commission_notes TEXT,
        ADD COLUMN IF NOT EXISTS commission_payment_status VARCHAR(50) DEFAULT 'UNPAID',
        ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS commission_paid_reference VARCHAR(100),
        ADD COLUMN IF NOT EXISTS financing_option VARCHAR(50) DEFAULT 'CASH',
        ADD COLUMN IF NOT EXISTS financing_institution_name VARCHAR(200),
        ADD COLUMN IF NOT EXISTS financing_amount NUMERIC(18, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS customer_contribution_amount NUMERIC(18, 2) DEFAULT 0;

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

      -- KMSICAMS-19: CKD/SKD Import & Inventory Integration
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
        status VARCHAR(25) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PARTIALLY_CLEARED', 'CLEARED', 'ON_HOLD', 'REJECTED', 'CANCELLED')),
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
        CONSTRAINT fk_clearance_batch_receipt FOREIGN KEY (batch_receipt_id, batch_id) REFERENCES ckd_skd_batch_receipt(batch_receipt_id, batch_id)
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
        serial_status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED' CHECK (serial_status IN ('RECEIVED', 'AVAILABLE', 'RESERVED', 'INSTALLED', 'REPLACED', 'REJECTED', 'RETURNED')),
        source_type VARCHAR(30) NOT NULL DEFAULT 'IMPORT' CHECK (source_type IN ('IMPORT', 'GOODS_RECEIPT', 'BULK_IMPORT', 'MANUAL')),
        source_reference VARCHAR(150),
        received_at TIMESTAMPTZ,
        created_by INT NOT NULL REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_ckd_serial_type_number ON ckd_skd_serial(serial_type, LOWER(BTRIM(serial_number)));
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
        processing_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'RETRY')),
        retry_count INT NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_integration_event_status ON integration_event(processing_status, created_at);
    `);
  } catch (err) {
    console.warn('⚠️ Sequence initialization note:', (err as any)?.message || err);
  } finally {
    await client.end().catch(() => {});
  }
}

async function bootstrap() {
  await ensureSequences();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Auto-run pending migrations and seed reference data on startup
  try {
    const dataSource = app.get(DataSource);
    console.log('🔄 Checking and executing pending migrations...');
    await dataSource.runMigrations();
    console.log('🌱 Checking and applying seed data...');
    await seedDatabase(dataSource);
  } catch (error) {
    console.error('⚠️ Startup migration/seeding note:', error);
  }

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(new TypeOrmExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve uploaded files statically across both root and backend uploads directories
  const currentCwd = process.cwd();
  const projectRoot = currentCwd.endsWith('backend') ? path.resolve(currentCwd, '..') : currentCwd;
  const rootUploadsPath = path.resolve(projectRoot, 'uploads');
  const backendUploadsPath = path.resolve(projectRoot, 'backend', 'uploads');

  const uploadDirs = [rootUploadsPath, backendUploadsPath];
  for (const dir of uploadDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const companyDir = path.resolve(dir, 'company');
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }
    app.useStaticAssets(dir, {
      prefix: '/uploads/',
    });
    app.useStaticAssets(dir, {
      prefix: '/api/uploads/',
    });
  }

  // Graceful fallback for company logos/branding requests so missing or legacy image URLs never return broken 404s
  const expressApp = app.getHttpAdapter().getInstance();
  const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><rect width="120" height="120" rx="20" fill="#0284c7"/><text x="60" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">KM</text></svg>`;

  const handleCompanyImageFallback = (req: any, res: any) => {
    // 1. Check if the exact requested file exists in any upload directory or company/ subdir
    const requestedPath = req.path || req.url;
    const cleanFilename = path.basename(requestedPath.split('?')[0]);

    for (const dir of uploadDirs) {
      const candidates = [
        path.resolve(dir, 'company', cleanFilename),
        path.resolve(dir, cleanFilename),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return res.sendFile(candidate);
        }
      }
    }

    // 2. Check if ANY valid company logo file exists in company/ folder
    for (const dir of uploadDirs) {
      const companyDir = path.resolve(dir, 'company');
      if (fs.existsSync(companyDir)) {
        const files = fs.readdirSync(companyDir).filter((f) => /\.(png|jpe?g|webp|svg|ico)$/i.test(f));
        if (files.length > 0) {
          const matchedFile = path.resolve(companyDir, files[0]);
          return res.sendFile(matchedFile);
        }
      }
    }

    // 3. Fallback: serve crisp default KANAB Motors SVG branding with 200 OK
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).send(fallbackSvg);
  };

  expressApp.get(
    [
      '/api/uploads/company/*',
      '/uploads/company/*',
      '/api/uploads/company_*',
      '/uploads/company_*',
      '/api/uploads/*logo*',
      '/uploads/*logo*',
    ],
    handleCompanyImageFallback,
  );

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('KANAB Motors - Sales, Inventory & Customer Management API')
    .setDescription(
      'REST APIs for KMSICAMS-1: Module 1 (Customer & Dealer Management) and Module 2 (Product & Vehicle Master Data)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  const operationalScan = setInterval(async () => {
    try {
      await app.get(ShipmentsService).generateAutomatedImportAlerts();
      await app.get(ApprovalsService).scanPendingApprovals();
      await app.get(EnquiriesService).scanExpiredInspections();
    } catch (error) {
      console.error('Operational deadline/reminder scan failed:', error);
    }
  }, 15 * 60 * 1000);
  operationalScan.unref();
  console.log(`🚀 KANAB Motors Backend running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
