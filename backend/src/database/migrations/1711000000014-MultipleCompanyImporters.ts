import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultipleCompanyImporters1711000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS company_importer (
        importer_id SERIAL PRIMARY KEY,
        company_profile_id INT REFERENCES company_profile(profile_id) ON DELETE CASCADE,
        importer_name VARCHAR(200) NOT NULL,
        iec_no VARCHAR(100) NOT NULL,
        ad_code VARCHAR(100) NOT NULL,
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_company_importer_profile ON company_importer(company_profile_id);

      -- Backfill initial importer record from company_profile if exists
      INSERT INTO company_importer (company_profile_id, importer_name, iec_no, ad_code, is_default, is_active)
      SELECT 
        profile_id, 
        'KANAB Motors PLC (Primary Importer)', 
        COALESCE(importer_iec_no, iec_no, 'ETH-IEC-994821'), 
        COALESCE(importer_ad_code, ad_code, 'AD-CBE-0019284'), 
        true, 
        true
      FROM company_profile
      ORDER BY is_default DESC, profile_id ASC
      LIMIT 1
      ON CONFLICT DO NOTHING;

      -- Add importer_id to purchase_order to link each PO to an importer record
      ALTER TABLE purchase_order ADD COLUMN IF NOT EXISTS importer_id INT REFERENCES company_importer(importer_id) ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_order DROP COLUMN IF EXISTS importer_id;
      DROP TABLE IF EXISTS company_importer CASCADE;
    `);
  }
}
