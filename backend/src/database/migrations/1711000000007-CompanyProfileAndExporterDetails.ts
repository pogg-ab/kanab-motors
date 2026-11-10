import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompanyProfileAndExporterDetails1711000000007 implements MigrationInterface {
  name = 'CompanyProfileAndExporterDetails1711000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enhance company_profile table
    await queryRunner.query(`
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS trade_name VARCHAR(255);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS logo TEXT;
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS registration_no VARCHAR(100);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS tin VARCHAR(100);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS vat_registration_no VARCHAR(100);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS website VARCHAR(255);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS importer_iec_no VARCHAR(100);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS importer_ad_code VARCHAR(100);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS created_by INT REFERENCES app_user(user_id);
      ALTER TABLE company_profile ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES app_user(user_id);

      -- Backfill and synchronize existing values
      UPDATE company_profile
      SET 
        trade_name = COALESCE(trade_name, 'KANAB Motors Ethiopia'),
        registration_no = COALESCE(registration_no, 'MOT/AA/01/2020/00491'),
        tin = COALESCE(tin, tax_id, 'TIN-0092837461'),
        vat_registration_no = COALESCE(vat_registration_no, 'VAT-ET-99018274'),
        website = COALESCE(website, 'https://www.kanabmotors.com'),
        importer_iec_no = COALESCE(importer_iec_no, iec_no, 'ETH-IEC-994821'),
        importer_ad_code = COALESCE(importer_ad_code, ad_code, 'AD-CBE-0019284')
      WHERE is_default = TRUE;
    `);

    // 2. Enhance company_bank_account table
    await queryRunner.query(`
      ALTER TABLE company_bank_account ADD COLUMN IF NOT EXISTS company_profile_id INT REFERENCES company_profile(profile_id) ON DELETE RESTRICT;
      ALTER TABLE company_bank_account ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE company_bank_account ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
      ALTER TABLE company_bank_account ADD COLUMN IF NOT EXISTS created_by INT REFERENCES app_user(user_id);
      ALTER TABLE company_bank_account ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES app_user(user_id);

      -- Backfill company_profile_id to default profile
      UPDATE company_bank_account
      SET company_profile_id = (SELECT profile_id FROM company_profile WHERE is_default = TRUE ORDER BY profile_id ASC LIMIT 1)
      WHERE company_profile_id IS NULL;

      -- Sync status with is_active
      UPDATE company_bank_account
      SET status = CASE WHEN is_active = TRUE THEN 'ACTIVE' ELSE 'INACTIVE' END;

      -- Designate primary CBE account as default
      UPDATE company_bank_account
      SET is_default = TRUE
      WHERE bank_account_id = (
        SELECT bank_account_id FROM company_bank_account 
        WHERE is_active = TRUE 
        ORDER BY bank_account_id ASC 
        LIMIT 1
      );
    `);

    // 3. Enhance purchase_order table with company_profile_id
    await queryRunner.query(`
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS company_profile_id INT REFERENCES company_profile(profile_id);

      UPDATE purchase_order
      SET company_profile_id = (SELECT profile_id FROM company_profile WHERE is_default = TRUE ORDER BY profile_id ASC LIMIT 1)
      WHERE company_profile_id IS NULL;
    `);

    // 4. Ensure supplier exporter fields exist and are indexed
    await queryRunner.query(`
      ALTER TABLE supplier ADD COLUMN IF NOT EXISTS exporter_iec_no VARCHAR(100);
      ALTER TABLE supplier ADD COLUMN IF NOT EXISTS exporter_ad_code VARCHAR(100);

      CREATE INDEX IF NOT EXISTS idx_supplier_exporter_iec ON supplier(exporter_iec_no);
      CREATE INDEX IF NOT EXISTS idx_company_bank_profile ON company_bank_account(company_profile_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_company_bank_profile;
      DROP INDEX IF EXISTS idx_supplier_exporter_iec;
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS company_profile_id;
      ALTER TABLE company_bank_account DROP COLUMN IF EXISTS updated_by;
      ALTER TABLE company_bank_account DROP COLUMN IF EXISTS created_by;
      ALTER TABLE company_bank_account DROP COLUMN IF EXISTS status;
      ALTER TABLE company_bank_account DROP COLUMN IF EXISTS is_default;
      ALTER TABLE company_bank_account DROP COLUMN IF EXISTS company_profile_id;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS updated_by;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS created_by;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS is_active;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS importer_ad_code;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS importer_iec_no;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS website;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS vat_registration_no;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS tin;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS registration_no;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS logo;
      ALTER TABLE company_profile DROP COLUMN IF EXISTS trade_name;
    `);
  }
}

