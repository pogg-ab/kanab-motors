import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCurrenciesDynamic1710970000000 implements MigrationInterface {
  name = 'MakeCurrenciesDynamic1710970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE shipment_cost_component DROP CONSTRAINT IF EXISTS chk_etb_rate_is_one`);
    await queryRunner.query(`
      ALTER TABLE exchange_rate_default
      ALTER COLUMN currency TYPE varchar(10) USING currency::text
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_order
      ALTER COLUMN currency TYPE varchar(10) USING currency::text
    `);
    await queryRunner.query(`
      ALTER TABLE purchase_order_line
      ALTER COLUMN currency TYPE varchar(10) USING currency::text
    `);
    await queryRunner.query(`
      ALTER TABLE shipment_cost_component
      ALTER COLUMN currency TYPE varchar(10) USING currency::text
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS currency_enum`);
    await queryRunner.query(`
      ALTER TABLE exchange_rate_default
      ADD CONSTRAINT chk_exchange_rate_currency_code
      CHECK (currency = UPPER(currency) AND currency ~ '^[A-Z]{3,10}$')
    `);
    await queryRunner.query(`
      ALTER TABLE exchange_rate_default
      ADD CONSTRAINT chk_exchange_rate_positive
      CHECK (rate_to_etb > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE shipment_cost_component DROP CONSTRAINT IF EXISTS chk_etb_rate_is_one`);
    await queryRunner.query(`ALTER TABLE exchange_rate_default DROP CONSTRAINT IF EXISTS chk_exchange_rate_positive`);
    await queryRunner.query(`ALTER TABLE exchange_rate_default DROP CONSTRAINT IF EXISTS chk_exchange_rate_currency_code`);
    await queryRunner.query(`DELETE FROM exchange_rate_default WHERE currency NOT IN ('ETB', 'USD', 'EUR')`);
    await queryRunner.query(`UPDATE purchase_order SET currency = 'USD' WHERE currency NOT IN ('ETB', 'USD', 'EUR')`);
    await queryRunner.query(`UPDATE purchase_order_line SET currency = 'USD' WHERE currency NOT IN ('ETB', 'USD', 'EUR')`);
    await queryRunner.query(`UPDATE shipment_cost_component SET currency = 'USD' WHERE currency NOT IN ('ETB', 'USD', 'EUR')`);
    await queryRunner.query(`CREATE TYPE currency_enum AS ENUM ('ETB', 'USD', 'EUR')`);
    await queryRunner.query(`ALTER TABLE shipment_cost_component ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum`);
    await queryRunner.query(`ALTER TABLE purchase_order_line ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum`);
    await queryRunner.query(`ALTER TABLE purchase_order ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum`);
    await queryRunner.query(`ALTER TABLE exchange_rate_default ALTER COLUMN currency TYPE currency_enum USING currency::currency_enum`);
  }
}

