import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreDynamicCurrencyChecks1710980000000 implements MigrationInterface {
  name = 'RestoreDynamicCurrencyChecks1710980000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE shipment_cost_component DROP CONSTRAINT IF EXISTS chk_etb_rate_is_one`);
    await queryRunner.query(`
      ALTER TABLE shipment_cost_component
      ADD CONSTRAINT chk_etb_rate_is_one CHECK (currency <> 'ETB' OR exchange_rate_to_etb = 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE shipment_cost_component DROP CONSTRAINT IF EXISTS chk_etb_rate_is_one`);
  }
}
