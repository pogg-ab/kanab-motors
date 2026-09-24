import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS2PaymentEnhancements1710160000000 implements MigrationInterface {
  name = 'KMSICAMS2PaymentEnhancements1710160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Make booking_id nullable for general customer account deposits (Story P4)
    await queryRunner.query(`
      ALTER TABLE customer_payment ALTER COLUMN booking_id DROP NOT NULL;
    `);

    // 2. Standardize BRV receipt number format to BRV-YYYY-XXXXX (Story P1)
    await queryRunner.query(`
      ALTER TABLE customer_payment 
      ALTER COLUMN receipt_number 
      SET DEFAULT ('BRV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('receipt_number_seq')::text, 5, '0'));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE customer_payment 
      ALTER COLUMN receipt_number 
      SET DEFAULT ('BRV-' || lpad(nextval('receipt_number_seq')::text, 5, '0'));
    `);
    await queryRunner.query(`
      ALTER TABLE customer_payment ALTER COLUMN booking_id SET NOT NULL;
    `);
  }
}
