import { MigrationInterface, QueryRunner } from 'typeorm';

export class MarkSeededVehicleItemsIndividuallyTracked1710930000000 implements MigrationInterface {
  name = 'MarkSeededVehicleItemsIndividuallyTracked1710930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE product_item pi
      SET is_individually_tracked = TRUE
      FROM product_category pc
      WHERE pc.category_id = pi.category_id
        AND (
          pc.category_name ILIKE '%vehicle%'
          OR pc.category_name ILIKE '%motorcycle%'
          OR pc.category_name ILIKE '%three_wheeler%'
          OR pc.category_name ILIKE '%truck%'
          OR pc.category_name ILIKE '%car%'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE product_item pi
      SET is_individually_tracked = FALSE
      FROM product_category pc
      WHERE pc.category_id = pi.category_id
        AND pc.category_name IN ('MOTORCYCLE', 'THREE_WHEELER', 'IMPORTED_VEHICLE')
    `);
  }
}
