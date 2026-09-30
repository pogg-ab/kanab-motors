import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class KMSICAMS3ImportLandedCost1710200000000 implements MigrationInterface {
  name = 'KMSICAMS3ImportLandedCost1710200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE product_item ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2) CHECK (weight_kg IS NULL OR weight_kg > 0);
      ALTER TABLE attachment ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);

      CREATE TABLE IF NOT EXISTS supplier (
          supplier_id     SERIAL PRIMARY KEY,
          supplier_name   VARCHAR(200) NOT NULL,
          country         VARCHAR(100),
          contact_person  VARCHAR(150),
          phone           VARCHAR(30),
          email           VARCHAR(150),
          address         TEXT,
          is_active       BOOLEAN NOT NULL DEFAULT TRUE,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS cost_component_type (
          cost_component_type_id SMALLSERIAL PRIMARY KEY,
          type_code       VARCHAR(40) NOT NULL UNIQUE,
          type_name       VARCHAR(150) NOT NULL
      );
      INSERT INTO cost_component_type (type_code, type_name) VALUES
          ('GOODS_VALUE', 'Goods Value'),
          ('FREIGHT', 'Freight'),
          ('INSURANCE', 'Insurance'),
          ('DJIBOUTI_PORT_HANDLING', 'Djibouti Port Handling'),
          ('ETHIOPIAN_CUSTOMS_DUTY', 'Ethiopian Customs Duty'),
          ('ETHIOPIAN_VAT', 'Ethiopian VAT'),
          ('INLAND_TRANSPORT', 'Inland Transport'),
          ('CLEARING_AGENT_FEES', 'Clearing Agent Fees')
      ON CONFLICT (type_code) DO NOTHING;

      DO $$ BEGIN
          CREATE TYPE currency_enum AS ENUM ('ETB', 'USD', 'EUR');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS exchange_rate_default (
          currency      currency_enum PRIMARY KEY,
          rate_to_etb   NUMERIC(18,6) NOT NULL CHECK (rate_to_etb > 0),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      INSERT INTO exchange_rate_default (currency, rate_to_etb) VALUES ('ETB', 1.000000)
      ON CONFLICT (currency) DO NOTHING;

      DO $$ BEGIN
          CREATE TYPE po_status_enum AS ENUM (
              'DRAFT', 'SUBMITTED', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS po_number_seq START 1;

      CREATE TABLE IF NOT EXISTS purchase_order (
          po_id       BIGSERIAL PRIMARY KEY,
          po_number   VARCHAR(20) NOT NULL UNIQUE
                      DEFAULT ('PO-' || lpad(nextval('po_number_seq')::text, 6, '0')),
          supplier_id INT NOT NULL REFERENCES supplier(supplier_id),
          po_date     DATE NOT NULL DEFAULT CURRENT_DATE,
          currency    currency_enum NOT NULL,
          status      po_status_enum NOT NULL DEFAULT 'DRAFT',
          notes       TEXT,
          created_by  INT REFERENCES app_user(user_id),
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by  INT REFERENCES app_user(user_id),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_order(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_order(status);

      DROP TRIGGER IF EXISTS trg_po_touch_updated_at ON purchase_order;
      CREATE TRIGGER trg_po_touch_updated_at
      BEFORE UPDATE ON purchase_order
      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

      CREATE TABLE IF NOT EXISTS purchase_order_line (
          po_line_id       BIGSERIAL PRIMARY KEY,
          po_line_id_seq   BIGSERIAL,
          po_id            BIGINT NOT NULL REFERENCES purchase_order(po_id) ON DELETE CASCADE,
          item_id          BIGINT NOT NULL REFERENCES product_item(item_id),
          quantity_ordered NUMERIC(12,2) NOT NULL CHECK (quantity_ordered > 0),
          unit_price       NUMERIC(18,4) NOT NULL CHECK (unit_price > 0),
          currency         currency_enum NOT NULL,
          line_total       NUMERIC(18,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED
      );
      CREATE INDEX IF NOT EXISTS idx_po_line_po ON purchase_order_line(po_id);
      CREATE INDEX IF NOT EXISTS idx_po_line_item ON purchase_order_line(item_id);

      DO $$ BEGIN
          CREATE TYPE shipment_stage_enum AS ENUM (
              'ORDERED', 'SHIPPED', 'AT_DJIBOUTI_PORT', 'ETHIOPIAN_CUSTOMS_CLEARANCE',
              'IN_TRANSIT_INLAND', 'RECEIVED'
          );
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS shipment_number_seq START 1;

      CREATE TABLE IF NOT EXISTS shipment (
          shipment_id            BIGSERIAL PRIMARY KEY,
          shipment_number        VARCHAR(20) NOT NULL UNIQUE
                                 DEFAULT ('SHIP-' || lpad(nextval('shipment_number_seq')::text, 6, '0')),
          current_stage          shipment_stage_enum NOT NULL DEFAULT 'ORDERED',
          bill_of_lading_number  VARCHAR(60),
          expected_arrival_date  DATE,
          actual_arrival_date    DATE,
          allocation_method      VARCHAR(20) NOT NULL DEFAULT 'BY_VALUE'
                                 CHECK (allocation_method IN ('BY_VALUE', 'BY_QUANTITY', 'BY_WEIGHT')),
          notes                  TEXT,
          created_by             INT REFERENCES app_user(user_id),
          created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_by             INT REFERENCES app_user(user_id),
          updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_stage ON shipment(current_stage);

      DROP TRIGGER IF EXISTS trg_shipment_touch_updated_at ON shipment;
      CREATE TRIGGER trg_shipment_touch_updated_at
      BEFORE UPDATE ON shipment
      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

      CREATE TABLE IF NOT EXISTS shipment_line (
          shipment_line_id  BIGSERIAL PRIMARY KEY,
          shipment_id       BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
          po_line_id        BIGINT NOT NULL REFERENCES purchase_order_line(po_line_id),
          quantity_shipped  NUMERIC(12,2) NOT NULL CHECK (quantity_shipped > 0),
          quantity_received NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
          UNIQUE (shipment_id, po_line_id)
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_line_shipment ON shipment_line(shipment_id);
      CREATE INDEX IF NOT EXISTS idx_shipment_line_po_line ON shipment_line(po_line_id);

      CREATE TABLE IF NOT EXISTS shipment_stage_history (
          stage_history_id  BIGSERIAL PRIMARY KEY,
          shipment_id       BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
          from_stage        shipment_stage_enum,
          to_stage          shipment_stage_enum NOT NULL,
          changed_by        INT REFERENCES app_user(user_id),
          changed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          notes             TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_stage_history_shipment ON shipment_stage_history(shipment_id);

      CREATE OR REPLACE FUNCTION fn_log_shipment_stage_change()
      RETURNS TRIGGER AS $fn$
      BEGIN
          IF NEW.current_stage IS DISTINCT FROM OLD.current_stage THEN
              INSERT INTO shipment_stage_history (shipment_id, from_stage, to_stage, changed_by)
              VALUES (NEW.shipment_id, OLD.current_stage, NEW.current_stage, NEW.updated_by);
          END IF;
          RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_log_shipment_stage_change ON shipment;
      CREATE TRIGGER trg_log_shipment_stage_change
      AFTER UPDATE ON shipment
      FOR EACH ROW EXECUTE FUNCTION fn_log_shipment_stage_change();

      ALTER TABLE vehicle_unit ADD COLUMN IF NOT EXISTS shipment_line_id BIGINT REFERENCES shipment_line(shipment_line_id);
      CREATE INDEX IF NOT EXISTS idx_vehicle_unit_shipment_line ON vehicle_unit(shipment_line_id);

      CREATE TABLE IF NOT EXISTS shipment_cost_component (
          cost_component_id      BIGSERIAL PRIMARY KEY,
          shipment_id            BIGINT NOT NULL REFERENCES shipment(shipment_id) ON DELETE CASCADE,
          cost_component_type_id SMALLINT NOT NULL REFERENCES cost_component_type(cost_component_type_id),
          amount                 NUMERIC(18,2) NOT NULL CHECK (amount > 0),
          currency               currency_enum NOT NULL,
          exchange_rate_to_etb   NUMERIC(18,6) NOT NULL CHECK (exchange_rate_to_etb > 0),
          amount_etb             NUMERIC(18,2) GENERATED ALWAYS AS (amount * exchange_rate_to_etb) STORED,
          notes                  TEXT,
          created_by             INT REFERENCES app_user(user_id),
          created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT chk_etb_rate_is_one CHECK (currency <> 'ETB' OR exchange_rate_to_etb = 1)
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_cost_component_shipment ON shipment_cost_component(shipment_id);

      CREATE TABLE IF NOT EXISTS shipment_line_landed_cost (
          line_landed_cost_id  BIGSERIAL PRIMARY KEY,
          shipment_line_id     BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id) ON DELETE CASCADE,
          allocated_cost_etb   NUMERIC(18,2) NOT NULL,
          allocation_basis     VARCHAR(20) NOT NULL,
          is_current           BOOLEAN NOT NULL DEFAULT TRUE,
          calculated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          calculated_by        INT REFERENCES app_user(user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_line_landed_cost_line ON shipment_line_landed_cost(shipment_line_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_shipment_line_landed_cost_current
          ON shipment_line_landed_cost(shipment_line_id) WHERE is_current;

      CREATE TABLE IF NOT EXISTS vehicle_unit_landed_cost (
          vehicle_unit_cost_id  BIGSERIAL PRIMARY KEY,
          vehicle_unit_id       BIGINT NOT NULL REFERENCES vehicle_unit(vehicle_unit_id) ON DELETE CASCADE,
          shipment_line_id      BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id),
          landed_cost_etb       NUMERIC(18,2) NOT NULL,
          is_current            BOOLEAN NOT NULL DEFAULT TRUE,
          calculated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
          calculated_by         INT REFERENCES app_user(user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_vehicle_unit_landed_cost_unit ON vehicle_unit_landed_cost(vehicle_unit_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_unit_landed_cost_current
          ON vehicle_unit_landed_cost(vehicle_unit_id) WHERE is_current;

      CREATE TABLE IF NOT EXISTS shipment_receipt (
          receipt_id         BIGSERIAL PRIMARY KEY,
          shipment_line_id   BIGINT NOT NULL REFERENCES shipment_line(shipment_line_id),
          quantity_received  NUMERIC(12,2) NOT NULL CHECK (quantity_received > 0),
          received_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          received_by        INT REFERENCES app_user(user_id),
          warehouse_id       INT REFERENCES warehouse(warehouse_id)
      );
      CREATE INDEX IF NOT EXISTS idx_shipment_receipt_line ON shipment_receipt(shipment_line_id);

      CREATE OR REPLACE FUNCTION fn_update_shipment_line_received_qty()
      RETURNS TRIGGER AS $fn$
      DECLARE
          v_shipped          NUMERIC(12,2);
          v_already_received NUMERIC(12,2);
      BEGIN
          SELECT quantity_shipped, quantity_received INTO v_shipped, v_already_received
          FROM shipment_line
          WHERE shipment_line_id = NEW.shipment_line_id
          FOR UPDATE;

          IF v_already_received + NEW.quantity_received > v_shipped THEN
              RAISE EXCEPTION
                  'Receipt quantity (%) would push total received to % of only % shipped for shipment_line %',
                  NEW.quantity_received, v_already_received + NEW.quantity_received, v_shipped, NEW.shipment_line_id;
          END IF;

          UPDATE shipment_line
          SET quantity_received = quantity_received + NEW.quantity_received
          WHERE shipment_line_id = NEW.shipment_line_id;

          RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_update_shipment_line_received_qty ON shipment_receipt;
      CREATE TRIGGER trg_update_shipment_line_received_qty
      AFTER INSERT ON shipment_receipt
      FOR EACH ROW EXECUTE FUNCTION fn_update_shipment_line_received_qty();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_update_shipment_line_received_qty ON shipment_receipt;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_update_shipment_line_received_qty;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_receipt;`);
    await queryRunner.query(`DROP TABLE IF EXISTS vehicle_unit_landed_cost;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_line_landed_cost;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_cost_component;`);
    await queryRunner.query(`ALTER TABLE vehicle_unit DROP COLUMN IF EXISTS shipment_line_id;`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_log_shipment_stage_change ON shipment;`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS fn_log_shipment_stage_change;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_stage_history;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_line;`);
    await queryRunner.query(`DROP TABLE IF EXISTS shipment;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS shipment_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS shipment_stage_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order_line;`);
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_order;`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS po_number_seq;`);
    await queryRunner.query(`DROP TYPE IF EXISTS po_status_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS exchange_rate_default;`);
    await queryRunner.query(`DROP TYPE IF EXISTS currency_enum;`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_component_type;`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier;`);
    await queryRunner.query(`ALTER TABLE attachment DROP COLUMN IF EXISTS document_type;`);
    await queryRunner.query(`ALTER TABLE product_item DROP COLUMN IF EXISTS weight_kg;`);
  }
}
