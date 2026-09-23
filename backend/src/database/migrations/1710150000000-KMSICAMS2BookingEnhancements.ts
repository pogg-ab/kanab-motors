import { MigrationInterface, QueryRunner } from 'typeorm';

export class KMSICAMS2BookingEnhancements1710150000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update booking_number sequence default to BKG-YYYY-XXXXX format (Story B1)
    await queryRunner.query(`
      ALTER TABLE booking 
      ALTER COLUMN booking_number SET DEFAULT ('BKG-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('booking_number_seq')::text, 5, '0'));
    `);

    // 2. Add target_delivery_date for delivery deadline monitoring (Story B9)
    await queryRunner.query(`
      ALTER TABLE booking 
      ADD COLUMN IF NOT EXISTS target_delivery_date TIMESTAMPTZ;
    `);

    // 3. Backfill target_delivery_date for existing records to 30 calendar days from bookingDate
    await queryRunner.query(`
      UPDATE booking 
      SET target_delivery_date = booking_date + INTERVAL '30 days'
      WHERE target_delivery_date IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE booking 
      DROP COLUMN IF EXISTS target_delivery_date;
    `);

    await queryRunner.query(`
      ALTER TABLE booking 
      ALTER COLUMN booking_number SET DEFAULT ('BKG-' || lpad(nextval('booking_number_seq')::text, 6, '0'));
    `);
  }
}
