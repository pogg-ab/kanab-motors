import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';
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
      INSERT INTO tax_configuration (tax_name, tax_rate_pct, is_active, tax_type, applicable_customer_type, applicable_vehicle_type, calculation_base, priority, effective_from, description)
      VALUES
        ('Excise Tax Motorcycle (10%)', 10.00, true, 'EXCISE', 'ALL', 'MOTORCYCLE', 'VEHICLE_PRICE', 1, '2026-01-01', '10% Excise Duty on High-Capacity Motorcycles (>150cc)'),
        ('Excise Tax Three-Wheeler (5%)', 5.00, true, 'EXCISE', 'ALL', 'THREE_WHEELER', 'VEHICLE_PRICE', 1, '2026-01-01', '5% Excise Duty on Three-Wheeler commercial units'),
        ('Standard VAT (15%)', 15.00, true, 'VAT', 'ALL', 'ALL', 'VEHICLE_PRICE', 2, '2026-01-01', 'Standard 15% VAT on all vehicles and spare parts'),
        ('Withholding Tax (2%)', 2.00, true, 'WHT', 'WHT_ONLY', 'ALL', 'VEHICLE_PRICE', 3, '2026-01-01', '2% Withholding Tax applied for WHT-liable / Government customers')
      ON CONFLICT DO NOTHING;
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

      -- Story X9: Credit transfer ledger transaction type support
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_ledger_transaction_transaction_type_enum') THEN
          ALTER TYPE customer_ledger_transaction_transaction_type_enum ADD VALUE IF NOT EXISTS 'CREDIT_TRANSFER';
          ALTER TYPE customer_ledger_transaction_transaction_type_enum ADD VALUE IF NOT EXISTS 'WHT_SETTLEMENT';
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

  // Serve uploaded files statically
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
  });
  app.useStaticAssets(uploadsPath, {
    prefix: '/api/uploads/',
  });

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
  console.log(`🚀 KANAB Motors Backend running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
