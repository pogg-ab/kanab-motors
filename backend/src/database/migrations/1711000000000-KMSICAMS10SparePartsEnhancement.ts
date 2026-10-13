import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS10SparePartsEnhancement1711000000000 implements MigrationInterface {
  name = 'KMSICAMS10SparePartsEnhancement1711000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend product_item additively with spare parts classification and attributes
    await queryRunner.query(`
      ALTER TABLE product_item
      ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'VEHICLE',
      ADD COLUMN IF NOT EXISTS part_number VARCHAR(100),
      ADD COLUMN IF NOT EXISTS barcode VARCHAR(100),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(18, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS preferred_supplier_id INT REFERENCES supplier(supplier_id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS compatible_make VARCHAR(100),
      ADD COLUMN IF NOT EXISTS compatible_model VARCHAR(100);

      CREATE INDEX IF NOT EXISTS idx_product_item_type ON product_item(item_type);
      CREATE INDEX IF NOT EXISTS idx_product_item_part_number ON product_item(part_number);
      CREATE INDEX IF NOT EXISTS idx_product_item_barcode ON product_item(barcode);
    `);

    // 2. Add spare_part_vehicle_compatibility table for many-to-many model mappings
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS spare_part_vehicle_compatibility (
        compatibility_id BIGSERIAL PRIMARY KEY,
        spare_part_id BIGINT NOT NULL REFERENCES product_item(item_id) ON DELETE CASCADE,
        vehicle_model VARCHAR(100) NOT NULL,
        vehicle_make VARCHAR(100),
        year_from INT,
        year_to INT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_by INT REFERENCES app_user(user_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sp_compat_part ON spare_part_vehicle_compatibility(spare_part_id);
      CREATE INDEX IF NOT EXISTS idx_sp_compat_model ON spare_part_vehicle_compatibility(vehicle_model);
    `);

    // 3. Create sequence and tables for spare parts sales transactions
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS spare_parts_sale_seq START WITH 1 INCREMENT BY 1;

      CREATE TABLE IF NOT EXISTS spare_parts_sale (
        sale_id BIGSERIAL PRIMARY KEY,
        sale_number VARCHAR(30) UNIQUE NOT NULL DEFAULT ('SPS-' || lpad(nextval('spare_parts_sale_seq')::text, 6, '0')),
        customer_id BIGINT REFERENCES customer(customer_id) ON DELETE SET NULL,
        customer_name VARCHAR(200) NOT NULL,
        customer_phone VARCHAR(50),
        customer_type VARCHAR(50) DEFAULT 'DIRECT_POS',
        warehouse_id INT NOT NULL REFERENCES warehouse(warehouse_id),
        sale_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        payment_method VARCHAR(50) DEFAULT 'CASH',
        payment_reference VARCHAR(100),
        subtotal NUMERIC(18, 2) NOT NULL DEFAULT 0,
        discount_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        vat_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
        grand_total NUMERIC(18, 2) NOT NULL DEFAULT 0,
        status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
        notes TEXT,
        created_by INT REFERENCES app_user(user_id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sps_customer ON spare_parts_sale(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sps_warehouse ON spare_parts_sale(warehouse_id);
      CREATE INDEX IF NOT EXISTS idx_sps_status ON spare_parts_sale(status);
      CREATE INDEX IF NOT EXISTS idx_sps_date ON spare_parts_sale(sale_date);

      CREATE TABLE IF NOT EXISTS spare_parts_sale_item (
        sale_item_id BIGSERIAL PRIMARY KEY,
        sale_id BIGINT NOT NULL REFERENCES spare_parts_sale(sale_id) ON DELETE CASCADE,
        item_id BIGINT NOT NULL REFERENCES product_item(item_id),
        quantity NUMERIC(12, 2) NOT NULL,
        unit_price NUMERIC(18, 2) NOT NULL,
        discount_percent NUMERIC(5, 2) DEFAULT 0,
        vat_percent NUMERIC(5, 2) DEFAULT 15,
        line_subtotal NUMERIC(18, 2) NOT NULL,
        line_vat NUMERIC(18, 2) NOT NULL,
        line_total NUMERIC(18, 2) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sps_item_sale ON spare_parts_sale_item(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sps_item_item ON spare_parts_sale_item(item_id);
    `);

    // 4. Seed default spare parts product categories if not existing
    await queryRunner.query(`
      INSERT INTO product_category (category_name)
      SELECT 'SPARE_PARTS'
      WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE category_name = 'SPARE_PARTS');

      INSERT INTO product_category (category_name)
      SELECT 'ACCESSORIES'
      WHERE NOT EXISTS (SELECT 1 FROM product_category WHERE category_name = 'ACCESSORIES');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS spare_parts_sale_item CASCADE;
      DROP TABLE IF EXISTS spare_parts_sale CASCADE;
      DROP SEQUENCE IF EXISTS spare_parts_sale_seq;
      DROP TABLE IF EXISTS spare_part_vehicle_compatibility CASCADE;
      
      DROP INDEX IF EXISTS idx_product_item_barcode;
      DROP INDEX IF EXISTS idx_product_item_part_number;
      DROP INDEX IF EXISTS idx_product_item_type;

      ALTER TABLE product_item
      DROP COLUMN IF EXISTS compatible_model,
      DROP COLUMN IF EXISTS compatible_make,
      DROP COLUMN IF EXISTS preferred_supplier_id,
      DROP COLUMN IF EXISTS purchase_price,
      DROP COLUMN IF EXISTS description,
      DROP COLUMN IF EXISTS barcode,
      DROP COLUMN IF EXISTS part_number,
      DROP COLUMN IF EXISTS item_type;
    `);
  }
}
