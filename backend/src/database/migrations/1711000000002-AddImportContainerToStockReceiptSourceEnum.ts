import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImportContainerToStockReceiptSourceEnum1711000000002 implements MigrationInterface {
  name = 'AddImportContainerToStockReceiptSourceEnum1711000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE stock_receipt_source_enum ADD VALUE IF NOT EXISTS 'IMPORT_CONTAINER';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // In PostgreSQL, removing a value from an enum type requires recreation of the enum, so down is a no-op
  }
}
