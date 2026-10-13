import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS11SparePartsUsageType1711000000001 implements MigrationInterface {
  name = 'KMSICAMS11SparePartsUsageType1711000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_item" 
      ADD COLUMN IF NOT EXISTS "usage_type" VARCHAR(30) NOT NULL DEFAULT 'BOTH';

      UPDATE "product_item"
      SET "usage_type" = 'BOTH'
      WHERE "usage_type" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product_item" DROP COLUMN IF EXISTS "usage_type";
    `);
  }
}
