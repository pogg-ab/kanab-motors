import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsureDefaultExchangeRates1710960000000 implements MigrationInterface {
  name = 'EnsureDefaultExchangeRates1710960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO exchange_rate_default (currency, rate_to_etb)
      VALUES
        ('ETB', 1.000000),
        ('USD', 125.000000),
        ('EUR', 135.000000)
      ON CONFLICT (currency) DO UPDATE
      SET rate_to_etb = CASE
        WHEN EXCLUDED.currency = 'ETB' THEN 1.000000
        ELSE exchange_rate_default.rate_to_etb
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM exchange_rate_default WHERE currency IN ('USD', 'EUR')`);
    await queryRunner.query(`UPDATE exchange_rate_default SET rate_to_etb = 1.000000 WHERE currency = 'ETB'`);
  }
}
