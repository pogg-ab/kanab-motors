import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialModules1And2171000000000 implements MigrationInterface {
  name = 'InitialModules1And2171000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Roles & Users stubs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS role (
        role_id SMALLSERIAL PRIMARY KEY,
        role_name VARCHAR(50) NOT NULL UNIQUE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_user (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        full_name VARCHAR(200) NOT NULL,
        role_id SMALLINT NOT NULL REFERENCES role(role_id),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // 2. Warehouse stub
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS warehouse (
        warehouse_id SERIAL PRIMARY KEY,
        warehouse_name VARCHAR(150) NOT NULL,
        location VARCHAR(250),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // 3. Generic Attachment
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS attachment (
        attachment_id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        content_type VARCHAR(100),
        file_size_bytes BIGINT,
        uploaded_by INT REFERENCES app_user(user_id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_attachment_entity ON attachment(entity_type, entity_id);
    `);

    // 4. Generic Audit Log
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        audit_id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id BIGINT NOT NULL,
        action VARCHAR(20) NOT NULL,
        changed_by INT REFERENCES app_user(user_id),
        changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        old_value JSONB,
        new_value JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    `);

    // 5. Shared trigger function fn_touch_updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_touch_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 6. Customer Enums, Regions & Sequences
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE customer_type_enum AS ENUM ('DIRECT_POS', 'DEALER', 'GOVERNMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS region (
        region_id SMALLSERIAL PRIMARY KEY,
        region_name VARCHAR(100) NOT NULL UNIQUE
      );
    `);

    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS customer_code_seq START 1;
    `);

    // 7. Customer Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer (
        customer_id BIGSERIAL PRIMARY KEY,
        customer_code VARCHAR(20) NOT NULL UNIQUE DEFAULT ('CUST-' || lpad(nextval('customer_code_seq')::text, 6, '0')),
        customer_type customer_type_enum NOT NULL,
        full_name VARCHAR(200) NOT NULL,
        region_id SMALLINT REFERENCES region(region_id),
        address_town VARCHAR(250),
        mobile_number VARCHAR(20) NOT NULL UNIQUE,
        tin_number VARCHAR(30),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_tin_required_for_dealer_gov
          CHECK (customer_type NOT IN ('DEALER', 'GOVERNMENT') OR tin_number IS NOT NULL)
      );
      CREATE INDEX IF NOT EXISTS idx_customer_type ON customer(customer_type);
      CREATE INDEX IF NOT EXISTS idx_customer_region ON customer(region_id);
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_customer_touch_updated_at ON customer;
      CREATE TRIGGER trg_customer_touch_updated_at
      BEFORE UPDATE ON customer
      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
    `);

    // 8. Customer Bank Account
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_bank_account (
        bank_account_id BIGSERIAL PRIMARY KEY,
        customer_id BIGINT NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
        bank_name VARCHAR(150) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        account_holder_name VARCHAR(200) NOT NULL,
        branch VARCHAR(150),
        is_primary BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_customer_bank_account_customer ON customer_bank_account(customer_id);
    `);

    // 9. Customer Account Summary & Trigger
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_account_summary (
        customer_id BIGINT PRIMARY KEY REFERENCES customer(customer_id) ON DELETE CASCADE,
        total_deposits NUMERIC(18,2) NOT NULL DEFAULT 0,
        allocated_to_bookings NUMERIC(18,2) NOT NULL DEFAULT 0,
        outstanding_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        available_credit NUMERIC(18,2) NOT NULL DEFAULT 0,
        excess_payments NUMERIC(18,2) NOT NULL DEFAULT 0,
        refundable_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION fn_create_customer_account_summary()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO customer_account_summary (customer_id) VALUES (NEW.customer_id)
        ON CONFLICT (customer_id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_create_customer_account_summary ON customer;
      CREATE TRIGGER trg_create_customer_account_summary
      AFTER INSERT ON customer
      FOR EACH ROW EXECUTE FUNCTION fn_create_customer_account_summary();
    `);

    // 10. Module 2: Category, Brand, UoM, Tax
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_category (
        category_id SMALLSERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS brand (
        brand_id SMALLSERIAL PRIMARY KEY,
        brand_name VARCHAR(100) NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS unit_of_measure (
        uom_id SMALLSERIAL PRIMARY KEY,
        uom_name VARCHAR(30) NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS tax_configuration (
        tax_config_id SMALLSERIAL PRIMARY KEY,
        tax_name VARCHAR(100) NOT NULL,
        tax_rate_pct NUMERIC(5,2) NOT NULL CHECK (tax_rate_pct >= 0),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // 11. Product Item
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_item (
        item_id BIGSERIAL PRIMARY KEY,
        item_code VARCHAR(30) NOT NULL UNIQUE,
        item_name VARCHAR(200) NOT NULL,
        category_id SMALLINT NOT NULL REFERENCES product_category(category_id),
        brand_id SMALLINT REFERENCES brand(brand_id),
        model VARCHAR(100),
        uom_id SMALLINT NOT NULL REFERENCES unit_of_measure(uom_id),
        selling_price NUMERIC(18,2) NOT NULL CHECK (selling_price > 0),
        tax_config_id SMALLINT REFERENCES tax_configuration(tax_config_id),
        reorder_level INT NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_product_item_category ON product_item(category_id);
      CREATE INDEX IF NOT EXISTS idx_product_item_brand ON product_item(brand_id);

      DROP TRIGGER IF EXISTS trg_product_item_touch_updated_at ON product_item;
      CREATE TRIGGER trg_product_item_touch_updated_at
      BEFORE UPDATE ON product_item
      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
    `);

    // 12. Vehicle Unit
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE vehicle_status_enum AS ENUM (
          'RECEIVED', 'AVAILABLE_FOR_SALE', 'RESERVED', 'ALLOTTED',
          'READY_FOR_DELIVERY', 'SOLD', 'DELIVERED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS vehicle_unit (
        vehicle_unit_id BIGSERIAL PRIMARY KEY,
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        chassis_number VARCHAR(50) NOT NULL UNIQUE,
        engine_number VARCHAR(50) NOT NULL UNIQUE,
        production_import_info TEXT,
        current_warehouse_id INT REFERENCES warehouse(warehouse_id),
        current_status vehicle_status_enum NOT NULL DEFAULT 'RECEIVED',
        created_by INT REFERENCES app_user(user_id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by INT REFERENCES app_user(user_id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_unit_item ON vehicle_unit(item_id);
      CREATE INDEX IF NOT EXISTS idx_vehicle_unit_status ON vehicle_unit(current_status);
      CREATE INDEX IF NOT EXISTS idx_vehicle_unit_warehouse ON vehicle_unit(current_warehouse_id);

      DROP TRIGGER IF EXISTS trg_vehicle_unit_touch_updated_at ON vehicle_unit;
      CREATE TRIGGER trg_vehicle_unit_touch_updated_at
      BEFORE UPDATE ON vehicle_unit
      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_unit CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS vehicle_status_enum CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_item CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tax_configuration CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS unit_of_measure CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS brand CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS product_category CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_account_summary CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer_bank_account CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS customer CASCADE;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS customer_code_seq CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS region CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS customer_type_enum CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS attachment CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS warehouse CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS app_user CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS role CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_touch_updated_at CASCADE;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_create_customer_account_summary CASCADE;`);
  }
}
