import { MigrationInterface, QueryRunner } from 'typeorm';

export class CompleteRemainingJiraAcceptanceGaps1711000000009 implements MigrationInterface {
  name = 'CompleteRemainingJiraAcceptanceGaps1711000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipment_freight_quotation
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

      UPDATE import_workflow_transition
      SET required_permission = 'SHIPMENTS_QUOTATION_APPROVE',
          responsible_role = 'APPROVER'
      WHERE workflow_type = 'FREIGHT_QUOTATION'
        AND from_status = 'PENDING'
        AND to_status = 'APPROVED';

      INSERT INTO import_workflow_transition (workflow_type, from_status, to_status, required_permission, responsible_role)
      VALUES
        ('FREIGHT_QUOTATION', 'PENDING', 'SELECTED', 'SHIPMENTS_CREATE', 'LOGISTICS_OFFICER'),
        ('FREIGHT_QUOTATION', 'SELECTED', 'APPROVED', 'SHIPMENTS_QUOTATION_APPROVE', 'APPROVER'),
        ('FREIGHT_QUOTATION', 'SELECTED', 'REJECTED', 'SHIPMENTS_QUOTATION_APPROVE', 'APPROVER'),
        ('FREIGHT_QUOTATION', 'PENDING', 'REJECTED', 'SHIPMENTS_QUOTATION_APPROVE', 'APPROVER')
      ON CONFLICT DO NOTHING;

      UPDATE role
      SET permissions = ARRAY(
        SELECT DISTINCT p FROM unnest(permissions || ARRAY['COMPANY_PROFILE_VIEW', 'COMPANY_PROFILE_EDIT']::text[]) AS p
      )
      WHERE role_name = 'FINANCE_MANAGER';

      UPDATE role
      SET permissions = ARRAY(
        SELECT DISTINCT p FROM unnest(permissions || ARRAY['COMPANY_PROFILE_VIEW']::text[]) AS p
      )
      WHERE role_name IN ('PROCUREMENT', 'MANAGEMENT_USER');

      UPDATE role
      SET permissions = ARRAY(
        SELECT DISTINCT p FROM unnest(permissions || ARRAY['SHIPMENTS_VIEW', 'SHIPMENTS_QUOTATION_APPROVE', 'COMPANY_PROFILE_VIEW']::text[]) AS p
      )
      WHERE role_name = 'APPROVER';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE role
      SET permissions = array_remove(array_remove(permissions, 'COMPANY_PROFILE_VIEW'), 'COMPANY_PROFILE_EDIT')
      WHERE role_name IN ('FINANCE_MANAGER', 'PROCUREMENT', 'MANAGEMENT_USER');

      UPDATE role
      SET permissions = array_remove(array_remove(array_remove(permissions, 'SHIPMENTS_QUOTATION_APPROVE'), 'SHIPMENTS_VIEW'), 'COMPANY_PROFILE_VIEW')
      WHERE role_name = 'APPROVER';

      DELETE FROM import_workflow_transition
      WHERE workflow_type = 'FREIGHT_QUOTATION'
        AND (
          (from_status = 'PENDING' AND to_status = 'SELECTED') OR
          (from_status = 'SELECTED' AND to_status = 'APPROVED') OR
          (from_status = 'SELECTED' AND to_status = 'REJECTED') OR
          (from_status = 'PENDING' AND to_status = 'REJECTED')
        );

      UPDATE import_workflow_transition
      SET required_permission = 'SHIPMENTS_CREATE',
          responsible_role = 'LOGISTICS_MANAGER'
      WHERE workflow_type = 'FREIGHT_QUOTATION'
        AND from_status = 'PENDING'
        AND to_status = 'APPROVED';

      ALTER TABLE shipment_freight_quotation
        DROP COLUMN IF EXISTS rejection_reason;
    `);
  }
}
