import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class KMSICAMS3ImportLandedCost1710200000000 implements MigrationInterface {
  name = 'KMSICAMS3ImportLandedCost1710200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const sqlPath = path.resolve(__dirname, '../../../../kanab_motors_schema_import_landed_cost.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await queryRunner.query(sql);
    }
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
