import { MigrationInterface, QueryRunner } from 'typeorm';
const DEFAULT_IMPORT_POLICY = {
  timezone:'Africa/Addis_Ababa',
  standardTerms:[
    'Import duties and local taxes, where applicable on arrival, are borne by the importing company.',
    "Bank charges and other expenses incurred in the supplier's country are borne by the supplier.",
    'Delivery lead time is {days} {dayType} days after {trigger}.',
  ],
  holidays:[],requirements:[],commercialRequirements:[],
  recipients:{payment:'FINANCE_OFFICER',lcExpiry:'FINANCE_MANAGER',lcShipment:'PROCUREMENT'},
  escalationDays:3,escalationRole:'FINANCE_MANAGER',
};

export class CompleteImportAcceptance1711000000011 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE import_process_policy (policy_id INT PRIMARY KEY CHECK(policy_id=1), settings JSONB NOT NULL);
      ALTER TABLE purchase_order ADD COLUMN destination_country VARCHAR(100), ADD COLUMN payment_method VARCHAR(40) NOT NULL DEFAULT 'TELEGRAPHIC_TRANSFER', ADD COLUMN inspection_required BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN issued_date DATE, ADD COLUMN standard_terms_snapshot JSONB, ADD COLUMN issued_document JSONB;
      ALTER TABLE po_payment_schedule ADD COLUMN is_advance BOOLEAN NOT NULL DEFAULT FALSE;
      UPDATE po_payment_schedule SET is_advance=TRUE WHERE lower(milestone_name) LIKE '%advance%';
      CREATE TABLE po_contract_revision (revision_id BIGSERIAL PRIMARY KEY, po_id BIGINT NOT NULL REFERENCES purchase_order(po_id), reason TEXT NOT NULL, document JSONB NOT NULL, changed_by INT REFERENCES app_user(user_id), created_at TIMESTAMPTZ NOT NULL DEFAULT now());`);
    await q.query('INSERT INTO import_process_policy VALUES (1,$1)', [JSON.stringify(DEFAULT_IMPORT_POLICY)]);
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TABLE po_contract_revision; DROP TABLE import_process_policy;
      ALTER TABLE po_payment_schedule DROP COLUMN is_advance;
      ALTER TABLE purchase_order DROP COLUMN destination_country, DROP COLUMN payment_method, DROP COLUMN inspection_required, DROP COLUMN issued_date, DROP COLUMN standard_terms_snapshot, DROP COLUMN issued_document;`);
  }
}
