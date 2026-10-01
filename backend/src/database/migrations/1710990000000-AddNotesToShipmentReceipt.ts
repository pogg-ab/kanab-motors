import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotesToShipmentReceipt1710990000000 implements MigrationInterface {
  name = 'AddNotesToShipmentReceipt1710990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipment_receipt
      ADD COLUMN IF NOT EXISTS notes TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipment_receipt
      DROP COLUMN IF EXISTS notes
    `);
  }
}
