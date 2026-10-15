import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerWhtVehicleSpecsColorAndTaxes1711000000003 implements MigrationInterface {
  name = 'AddCustomerWhtVehicleSpecsColorAndTaxes1711000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Customer WHT flag
    await queryRunner.query(`
      ALTER TABLE customer ADD COLUMN IF NOT EXISTS withholding_tax_flag BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    // 2. Vehicle specifications (colour, engine capacity, battery power)
    await queryRunner.query(`
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS colour VARCHAR(50);
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS engine_capacity_cc VARCHAR(50);
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS battery_power_kwh NUMERIC(6, 2);
    `);

    // 3. Vehicle color lookups
    await queryRunner.query(`
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
    `);

    // 4. Tax configuration expansion (VAT, Excise, WHT with applicability)
    await queryRunner.query(`
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS tax_type VARCHAR(20) DEFAULT 'VAT';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS applicable_customer_type VARCHAR(30) DEFAULT 'ALL';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS applicable_vehicle_type VARCHAR(50) DEFAULT 'ALL';
      ALTER TABLE tax_configuration ADD COLUMN IF NOT EXISTS description TEXT;

      INSERT INTO tax_configuration (tax_name, tax_rate_pct, is_active, tax_type, applicable_customer_type, applicable_vehicle_type, description)
      VALUES
        ('Standard VAT (15%)', 15.00, true, 'VAT', 'ALL', 'ALL', 'Standard 15% VAT on all vehicles and spare parts'),
        ('Withholding Tax (2%)', 2.00, true, 'WHT', 'WHT_ONLY', 'ALL', '2% Withholding Tax applied for WHT-liable / Government customers'),
        ('Excise Tax Three-Wheeler (5%)', 5.00, true, 'EXCISE', 'ALL', 'THREE_WHEELER', '5% Excise Duty on Three-Wheeler commercial units'),
        ('Excise Tax Motorcycle (10%)', 10.00, true, 'EXCISE', 'ALL', 'MOTORCYCLE', '10% Excise Duty on High-Capacity Motorcycles (>150cc)')
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer DROP COLUMN IF EXISTS withholding_tax_flag;
      ALTER TABLE product_item DROP COLUMN IF EXISTS colour;
      ALTER TABLE product_item DROP COLUMN IF EXISTS engine_capacity_cc;
      ALTER TABLE product_item DROP COLUMN IF EXISTS battery_power_kwh;
      DROP TABLE IF EXISTS vehicle_color;
      ALTER TABLE tax_configuration DROP COLUMN IF EXISTS tax_type;
      ALTER TABLE tax_configuration DROP COLUMN IF EXISTS applicable_customer_type;
      ALTER TABLE tax_configuration DROP COLUMN IF EXISTS applicable_vehicle_type;
      ALTER TABLE tax_configuration DROP COLUMN IF EXISTS description;
    `);
  }
}
