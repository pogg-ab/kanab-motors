import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS2FinancialEngine1710100000000 implements MigrationInterface {
  name = 'KMSICAMS2FinancialEngine1710100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Transaction Types Enum for Customer Ledger
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE ledger_transaction_type_enum AS ENUM (
          'ADVANCE_DEPOSIT',
          'ADDITIONAL_PAYMENT',
          'INVOICE_CHARGE',
          'PAYMENT_ALLOCATION',
          'CUSTOMER_CREDIT',
          'EXCESS_PAYMENT',
          'REFUND',
          'ADJUSTMENT',
          'BOOKING_CANCELLATION',
          'BOOKING_TRANSFER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Sales Enquiry Table & Sequences
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE enquiry_status_enum AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS enquiry_number_seq START 1;

      CREATE TABLE IF NOT EXISTS sales_enquiry (
        enquiry_id BIGSERIAL PRIMARY KEY,
        enquiry_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('ENQ-' || lpad(nextval('enquiry_number_seq')::text, 6, '0')),
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price > 0),
        vat_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        estimated_sales_value NUMERIC(18,2) NOT NULL CHECK (estimated_sales_value > 0),
        salesperson_name VARCHAR(200) NOT NULL,
        payment_mode VARCHAR(50) NOT NULL DEFAULT 'BANK_DEPOSIT',
        status enquiry_status_enum NOT NULL DEFAULT 'SUBMITTED',
        rejection_reason TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_enquiry_customer ON sales_enquiry(customer_id);
      CREATE INDEX IF NOT EXISTS idx_enquiry_status ON sales_enquiry(status);
    `);

    // 3. Advance Order & Booking Table & Sequences
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE booking_status_enum AS ENUM (
          'PENDING_APPROVAL',
          'APPROVED',
          'CONFIRMED',
          'ALLOTTED',
          'SETTLED',
          'CANCELLED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS booking_number_seq START 1;

      CREATE TABLE IF NOT EXISTS booking (
        booking_id BIGSERIAL PRIMARY KEY,
        booking_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('BKG-' || lpad(nextval('booking_number_seq')::text, 6, '0')),
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        enquiry_id BIGINT REFERENCES sales_enquiry(enquiry_id),
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        quantity INT NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(18,2) NOT NULL CHECK (unit_price > 0),
        vat_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
        gross_total NUMERIC(18,2) NOT NULL CHECK (gross_total > 0),
        required_advance_amount NUMERIC(18,2) NOT NULL CHECK (required_advance_amount >= 0),
        total_amount_deposited NUMERIC(18,2) NOT NULL DEFAULT 0,
        outstanding_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
        booking_status booking_status_enum NOT NULL DEFAULT 'PENDING_APPROVAL',
        salesperson_name VARCHAR(200) NOT NULL,
        cancellation_reason TEXT,
        cancelled_at TIMESTAMPTZ,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_booking_customer ON booking(customer_id);
      CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(booking_status);
    `);

    // 4. Customer Payment Table (Bank Receipt Voucher - BRV)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE payment_instrument_enum AS ENUM ('CASH', 'BANK_DEPOSIT', 'TRANSFER', 'CHEQUE');
        CREATE TYPE payment_status_enum AS ENUM ('SUBMITTED', 'CONFIRMED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

      CREATE TABLE IF NOT EXISTS customer_payment (
        payment_id BIGSERIAL PRIMARY KEY,
        receipt_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('BRV-' || lpad(nextval('receipt_number_seq')::text, 5, '0')),
        booking_id BIGINT NOT NULL REFERENCES booking(booking_id),
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
        instrument_type payment_instrument_enum NOT NULL DEFAULT 'BANK_DEPOSIT',
        bank_name VARCHAR(150) NOT NULL,
        amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
        reference_number VARCHAR(100) NOT NULL,
        reference_date DATE,
        status payment_status_enum NOT NULL DEFAULT 'SUBMITTED',
        confirmed_by INT REFERENCES app_user(user_id),
        confirmed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_payment_booking ON customer_payment(booking_id);
      CREATE INDEX IF NOT EXISTS idx_payment_customer ON customer_payment(customer_id);
    `);

    // 5. Customer Ledger Transaction Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_ledger_transaction (
        transaction_id BIGSERIAL PRIMARY KEY,
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
        transaction_type ledger_transaction_type_enum NOT NULL,
        reference_number VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        debit_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
        credit_amount NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
        running_balance NUMERIC(18,2) NOT NULL,
        related_booking_id BIGINT REFERENCES booking(booking_id),
        related_receipt_id BIGINT REFERENCES customer_payment(payment_id),
        related_sales_invoice_id BIGINT,
        processed_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ledger_customer ON customer_ledger_transaction(customer_id);
      CREATE INDEX IF NOT EXISTS idx_ledger_date ON customer_ledger_transaction(transaction_date);
    `);

    // 6. Customer Refund Table & Sequence
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE refund_status_enum AS ENUM (
          'REQUESTED',
          'REVIEWED',
          'APPROVED',
          'FINANCE_PROCESSED',
          'CONFIRMED',
          'REJECTED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS refund_number_seq START 1;

      CREATE TABLE IF NOT EXISTS customer_refund (
        refund_id BIGSERIAL PRIMARY KEY,
        refund_number VARCHAR(30) NOT NULL UNIQUE DEFAULT ('RFD-' || lpad(nextval('refund_number_seq')::text, 5, '0')),
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id),
        booking_id BIGINT REFERENCES booking(booking_id),
        original_payment_reference VARCHAR(100),
        refund_reason TEXT NOT NULL,
        refund_amount NUMERIC(18,2) NOT NULL CHECK (refund_amount > 0),
        refund_method VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
        bank_account_id BIGINT REFERENCES customer_bank_account(bank_account_id),
        status refund_status_enum NOT NULL DEFAULT 'REQUESTED',
        reviewed_by INT REFERENCES app_user(user_id),
        reviewed_at TIMESTAMPTZ,
        approved_by INT REFERENCES app_user(user_id),
        approved_at TIMESTAMPTZ,
        processed_by INT REFERENCES app_user(user_id),
        processed_at TIMESTAMPTZ,
        rejection_reason TEXT,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_refund_customer ON customer_refund(customer_id);
      CREATE INDEX IF NOT EXISTS idx_refund_status ON customer_refund(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS customer_refund CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS refund_number_seq CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS refund_status_enum CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_ledger_transaction CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_payment CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS receipt_number_seq CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_status_enum CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS payment_instrument_enum CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS booking CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS booking_number_seq CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS booking_status_enum CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sales_enquiry CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS enquiry_number_seq CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS enquiry_status_enum CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS ledger_transaction_type_enum CASCADE;`);
  }
}
